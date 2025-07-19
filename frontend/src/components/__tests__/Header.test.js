import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../Header';
import { AuthContext } from '../../utils/AuthContext';

// Mock the AuthContext
const mockAuthContext = {
  user: global.testUtils.mockUser,
  token: global.testUtils.mockUser.token,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

const renderWithProviders = (component, authValue = mockAuthContext) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header with title', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText(/Rainbow Seeker/i)).toBeInTheDocument();
  });

  it('displays navigation menu when user is authenticated', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Rainbows/i)).toBeInTheDocument();
    expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
  });

  it('displays user info when authenticated', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText(mockAuthContext.user.name)).toBeInTheDocument();
  });

  it('shows login button when not authenticated', () => {
    const unauthenticatedContext = {
      ...mockAuthContext,
      user: null,
      token: null
    };
    
    renderWithProviders(<Header />, unauthenticatedContext);
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
  });

  it('handles logout when logout button is clicked', async () => {
    renderWithProviders(<Header />);
    
    const logoutButton = screen.getByText(/Logout/i);
    fireEvent.click(logoutButton);
    
    await waitFor(() => {
      expect(mockAuthContext.logout).toHaveBeenCalledTimes(1);
    });
  });

  it('displays mobile menu toggle on small screens', () => {
    renderWithProviders(<Header />);
    const menuToggle = screen.getByRole('button', { name: /menu/i });
    expect(menuToggle).toBeInTheDocument();
  });

  it('toggles mobile menu when menu button is clicked', () => {
    renderWithProviders(<Header />);
    
    const menuToggle = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuToggle);
    
    // Check if mobile menu is visible
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    renderWithProviders(<Header />);
    
    const dashboardLink = screen.getByText(/Dashboard/i);
    expect(dashboardLink).toHaveClass('active');
  });

  it('displays notification badge when there are unread notifications', () => {
    const contextWithNotifications = {
      ...mockAuthContext,
      unreadNotifications: 3
    };
    
    renderWithProviders(<Header />, contextWithNotifications);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    renderWithProviders(<Header />);
    
    const dashboardLink = screen.getByText(/Dashboard/i);
    dashboardLink.focus();
    
    fireEvent.keyDown(dashboardLink, { key: 'Enter' });
    expect(dashboardLink).toHaveFocus();
  });

  it('renders accessibility attributes', () => {
    renderWithProviders(<Header />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();
    
    const menuToggle = screen.getByRole('button', { name: /menu/i });
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('displays loading state when authentication is loading', () => {
    const loadingContext = {
      ...mockAuthContext,
      loading: true
    };
    
    renderWithProviders(<Header />, loadingContext);
    expect(screen.getByTestId('header-loading')).toBeInTheDocument();
  });
});