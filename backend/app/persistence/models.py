from sqlalchemy import (
    Integer, BigInteger, String, ForeignKey, Index, JSON,
    select, func, delete, UniqueConstraint, Text
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Host(Base):
    """Registered monitoring host."""
    __tablename__ = "hosts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    host_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    registered_at: Mapped[int] = mapped_column(Integer)
    last_seen: Mapped[int] = mapped_column(Integer)
    
    devices: Mapped[list["Device"]] = relationship(
        "Device", back_populates="host", cascade="all, delete-orphan"
    )
    config: Mapped["HostConfig"] = relationship(
        "HostConfig", back_populates="host", uselist=False, cascade="all, delete-orphan"
    )


class HostConfig(Base):
    """Host configuration stored on backend."""
    __tablename__ = "host_configs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    host_id: Mapped[str] = mapped_column(
        String, ForeignKey("hosts.host_id"), unique=True, index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    config: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[int] = mapped_column(Integer)
    
    host: Mapped[Host] = relationship("Host", back_populates="config")


class Device(Base):
    """
    Monitored device/component within a host.
    Backend only tracks device+metric_name - no collector concept.
    """
    __tablename__ = "devices"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    host_id: Mapped[str] = mapped_column(
        String, ForeignKey("hosts.host_id"), index=True
    )
    name: Mapped[str] = mapped_column(String)  # Unique identifier (e.g., serial number)
    type: Mapped[str] = mapped_column(String)  # cpu, ram, hdd, ssd, zfs_pool, network
    label: Mapped[str] = mapped_column(String)  # Human-readable label
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Integer, default=1)
    
    host: Mapped[Host] = relationship("Host", back_populates="devices")
    raw_metrics: Mapped[list["RawMetric"]] = relationship(
        "RawMetric", back_populates="device", cascade="all, delete-orphan"
    )
    minute_metrics: Mapped[list["ResampleMetricMinute"]] = relationship(
        "ResampleMetricMinute", back_populates="device", cascade="all, delete-orphan"
    )
    hourly_metrics: Mapped[list["ResampleMetricHourly"]] = relationship(
        "ResampleMetricHourly", back_populates="device", cascade="all, delete-orphan"
    )
    history_metrics: Mapped[list["ResampleMetricHistory"]] = relationship(
        "ResampleMetricHistory", back_populates="device", cascade="all, delete-orphan"
    )
    daily_metrics: Mapped[list["ResampleMetricDaily"]] = relationship(
        "ResampleMetricDaily", back_populates="device", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        UniqueConstraint('host_id', 'name', name='uq_device_host_name'),
        Index("idx_device_type", "type"),
    )


class RawMetric(Base):
    """
    Raw metrics - high frequency data from clients.
    Values are always int (as sent by client).
    Deleted only after resampling is complete.
    """
    __tablename__ = "raw_metrics"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[int] = mapped_column(Integer, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    name: Mapped[str] = mapped_column(String, index=True)  # Metric name
    value: Mapped[int] = mapped_column(BigInteger)  # Always int for raw data
    
    device: Mapped[Device] = relationship("Device", back_populates="raw_metrics")
    
    # Composite index for fast time-range queries
    __table_args__ = (
        Index("idx_raw_device_name_ts", "device_id", "name", "timestamp"),
    )
    
    @classmethod
    async def get_range(
        cls,
        session,
        device_id: int,
        label: str,
        start_ts: int,
        end_ts: int,
        limit: int = 1000
    ):
        """Get metrics in time range."""
        stmt = select(cls.timestamp, cls.value).where(
            cls.device_id == device_id,
            cls.name == label,
            cls.timestamp >= start_ts,
            cls.timestamp < end_ts
        ).order_by(cls.timestamp).limit(limit)
        
        result = await session.execute(stmt)
        return result.fetchall()


class ResampleMetricMinute(Base):
    """
    Minute resampled metrics - aggregated by minute from raw data.
    Used for minute/hour views. Deleted after 90 days.
    Contains float values for min/max/avg.
    """
    __tablename__ = "resample_minute"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[int] = mapped_column(Integer, index=True)  # Minute window start
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    min_value: Mapped[float] = mapped_column(BigInteger)
    max_value: Mapped[float] = mapped_column(BigInteger)
    avg_value: Mapped[float] = mapped_column(BigInteger)

    device: Mapped[Device] = relationship("Device", back_populates="minute_metrics")

    __table_args__ = (
        Index("idx_minute_device_name_ts", "device_id", "name", "timestamp"),
    )

    @classmethod
    async def get_range(
        cls,
        session,
        device_id: int,
        label: str,
        start_ts: int,
        end_ts: int,
        limit: int = 1000
    ):
        """Get metrics in time range."""
        stmt = select(cls.timestamp, cls.avg_value).where(
            cls.device_id == device_id,
            cls.name == label,
            cls.timestamp >= start_ts,
            cls.timestamp < end_ts
        ).order_by(cls.timestamp).limit(limit)

        result = await session.execute(stmt)
        return result.fetchall()


class ResampleMetricHourly(Base):
    """
    Hourly resampled metrics - aggregated by minute.
    Used for day/week/month views. Deleted after 1 year.
    Contains float values for min/max/avg.
    """
    __tablename__ = "resample_hourly"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[int] = mapped_column(Integer, index=True)  # Minute window start
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    min_value: Mapped[float] = mapped_column(BigInteger)
    max_value: Mapped[float] = mapped_column(BigInteger)
    avg_value: Mapped[float] = mapped_column(BigInteger)
    
    device: Mapped[Device] = relationship("Device", back_populates="hourly_metrics")
    
    __table_args__ = (
        Index("idx_hourly_device_name_ts", "device_id", "name", "timestamp"),
    )
    
    @classmethod
    async def get_range(
        cls,
        session,
        device_id: int,
        label: str,
        start_ts: int,
        end_ts: int,
        limit: int = 1000
    ):
        """Get metrics in time range."""
        stmt = select(cls.timestamp, cls.avg_value).where(
            cls.device_id == device_id,
            cls.name == label,
            cls.timestamp >= start_ts,
            cls.timestamp < end_ts
        ).order_by(cls.timestamp).limit(limit)
        
        result = await session.execute(stmt)
        return result.fetchall()


class ResampleMetricHistory(Base):
    """
    Historical resampled metrics - aggregated by hour.
    Used for day/week/month views. Deleted after 1 year.
    Contains float values for min/max/avg.
    """
    __tablename__ = "resample_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[int] = mapped_column(Integer, index=True)  # Hour window start
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    min_value: Mapped[float] = mapped_column(BigInteger)
    max_value: Mapped[float] = mapped_column(BigInteger)
    avg_value: Mapped[float] = mapped_column(BigInteger)

    device: Mapped[Device] = relationship("Device", back_populates="history_metrics")

    __table_args__ = (
        Index("idx_history_device_name_ts", "device_id", "name", "timestamp"),
    )
    
    @classmethod
    async def get_range(
        cls,
        session,
        device_id: int,
        label: str,
        start_ts: int,
        end_ts: int,
        limit: int = 1000
    ):
        """Get metrics in time range."""
        stmt = select(cls.timestamp, cls.avg_value).where(
            cls.device_id == device_id,
            cls.name == label,
            cls.timestamp >= start_ts,
            cls.timestamp < end_ts
        ).order_by(cls.timestamp).limit(limit)
        
        result = await session.execute(stmt)
        return result.fetchall()


class ResampleMetricDaily(Base):
    """
    Daily resampled metrics - aggregated by day.
    Never deleted, used for year+ views.
    Contains float values for min/max/avg.
    """
    __tablename__ = "resample_daily"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[int] = mapped_column(Integer, index=True)  # Day window start (midnight UTC)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    min_value: Mapped[float] = mapped_column(BigInteger)
    max_value: Mapped[float] = mapped_column(BigInteger)
    avg_value: Mapped[float] = mapped_column(BigInteger)

    device: Mapped[Device] = relationship("Device", back_populates="daily_metrics")

    __table_args__ = (
        Index("idx_daily_device_name_ts", "device_id", "name", "timestamp"),
    )
    
    @classmethod
    async def get_range(
        cls,
        session,
        device_id: int,
        label: str,
        start_ts: int,
        end_ts: int,
        limit: int = 1000
    ):
        """Get metrics in time range."""
        stmt = select(cls.timestamp, cls.avg_value).where(
            cls.device_id == device_id,
            cls.name == label,
            cls.timestamp >= start_ts,
            cls.timestamp < end_ts
        ).order_by(cls.timestamp).limit(limit)
        
        result = await session.execute(stmt)
        return result.fetchall()


class ResampleState(Base):
    """Tracks last processed timestamp for resampling jobs."""
    __tablename__ = "resample_state"

    level: Mapped[str] = mapped_column(String, primary_key=True)  # 'minute', 'hour', 'daily'
    last_ts: Mapped[int] = mapped_column(Integer, default=0)

    @classmethod
    async def get_last_ts(cls, session, level: str) -> int:
        """Get last processed timestamp for a level."""
        stmt = select(cls.last_ts).where(cls.level == level)
        result = await session.execute(stmt)
        row = result.scalar_one_or_none()
        return row if row is not None else 0

    @classmethod
    async def set_last_ts(cls, session, level: str, ts: int):
        """Set last processed timestamp for a level."""
        stmt = select(cls).where(cls.level == level)
        result = await session.execute(stmt)
        row = result.scalar_one_or_none()

        if row:
            row.last_ts = ts
        else:
            session.add(cls(level=level, last_ts=ts))


class Dashboard(Base):
    """
    Dashboard configuration - independent from hosts.
    Can contain widgets from any host.
    """
    __tablename__ = "dashboards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, default="My Dashboard")
    version: Mapped[int] = mapped_column(Integer, default=1)
    layout: Mapped[dict] = mapped_column(JSON, default=dict)  # vue-grid-layout state (dict keyed by widget id)
    widgets: Mapped[dict] = mapped_column(JSON, default=dict)  # widget configurations (dict keyed by widget id)
    created_at: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[int] = mapped_column(Integer)

    @classmethod
    async def get_default(cls, session) -> "Dashboard | None":
        """Get the default dashboard (first one)."""
        stmt = select(cls).order_by(cls.id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
