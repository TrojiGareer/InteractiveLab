import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session


DEFAULT_TEST_DATABASE_URL = (
    "postgresql+psycopg://interactive_test:interactive_test@"
    "127.0.0.1:5433/interactive_lab_test"
)
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    DEFAULT_TEST_DATABASE_URL,
)
DEVELOPMENT_DATABASE_URL = os.environ.get("DATABASE_URL")


def _validate_test_database_url() -> None:
    test_url = make_url(TEST_DATABASE_URL)

    if DEVELOPMENT_DATABASE_URL == TEST_DATABASE_URL:
        raise RuntimeError(
            "TEST_DATABASE_URL must not be the same as DATABASE_URL."
        )

    if not test_url.database or not test_url.database.endswith("_test"):
        raise RuntimeError(
            "TEST_DATABASE_URL must target a database ending in '_test'."
        )


_validate_test_database_url()
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from app.db.session import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


test_engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,
)


@pytest.fixture(scope="session")
def create_test_schema() -> Generator[None, None, None]:
    """Create only the isolated PostgreSQL test schema if migrations were not run."""
    try:
        Base.metadata.create_all(test_engine)
    except Exception as error:
        pytest.fail(
            "Could not prepare the PostgreSQL test database. Start it with "
            "'docker compose -f docker-compose.test.yml up -d db-test'. "
            f"Connection error: {error}"
        )

    yield


@pytest.fixture
def client(
    create_test_schema: None,
) -> Generator[TestClient, None, None]:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(
        bind=connection,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )

    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        session.close()
        transaction.rollback()
        connection.close()
