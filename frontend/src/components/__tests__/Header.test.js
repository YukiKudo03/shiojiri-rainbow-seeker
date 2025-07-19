import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../Header';
import { AuthContext } from '../../utils/AuthContext';

// Mock the AuthContext
const mockAuthContext = {
  user: { name: 'Test User' },
  logout: jest.fn(),
};

const renderWithAuth = (component) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {component}
    </AuthContext.Provider>
  );
};

describe('Header Component', () => {
  test('renders header with user info', () => {
    renderWithAuth(<Header />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  test('displays rainbow seeker title', () => {
    renderWithAuth(<Header />);
    expect(screen.getByText(/rainbow/i)).toBeInTheDocument();
  });
});