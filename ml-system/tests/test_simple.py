"""
Simple test to verify the testing framework works.
"""
import pytest
import sys
import os

def test_simple_math():
    """Test basic math operations."""
    assert 1 + 1 == 2
    assert 2 * 3 == 6
    assert 10 / 2 == 5

def test_string_operations():
    """Test string operations."""
    assert "hello" + " world" == "hello world"
    assert "test".upper() == "TEST"
    assert len("python") == 6

def test_list_operations():
    """Test list operations."""
    test_list = [1, 2, 3]
    assert len(test_list) == 3
    assert test_list[0] == 1
    assert sum(test_list) == 6

def test_environment_setup():
    """Test that the environment is set up correctly."""
    # These should be set by conftest.py
    assert os.environ.get('DATABASE_URL') is not None
    assert os.environ.get('REDIS_HOST') is not None
    assert os.environ.get('WEATHER_API_KEY') is not None