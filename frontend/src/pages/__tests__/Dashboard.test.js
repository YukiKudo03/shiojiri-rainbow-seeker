import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { AuthContext } from '../../utils/AuthContext';
import * as apiService from '../../services/apiService';

// Mock the API service
jest.mock('../../services/apiService');

const mockAuthContext = {
  user: global.testUtils.mockUser,
  token: global.testUtils.mockUser.token,
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

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    apiService.getRainbowStats.mockResolvedValue(
      global.testUtils.createMockResponse({
        total_sightings: 42,
        this_month: 8,
        average_intensity: 7.5,
        most_common_location: 'Shiojiri City'
      })
    );

    apiService.getRecentRainbows.mockResolvedValue(
      global.testUtils.createMockResponse([
        global.testUtils.mockRainbow,
        { ...global.testUtils.mockRainbow, id: 2, title: 'Another Rainbow' }
      ])
    );

    apiService.getCurrentWeather.mockResolvedValue(
      global.testUtils.createMockResponse(global.testUtils.mockWeatherData)
    );

    apiService.getPredictionData.mockResolvedValue(
      global.testUtils.createMockResponse({
        probability: 0.75,
        confidence: 0.85,
        next_likely_time: '2024-01-02T15:30:00Z'
      })
    );
  });

  it('renders dashboard with all sections', async () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Statistics/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Rainbows/i)).toBeInTheDocument();
    expect(screen.getByText(/Weather/i)).toBeInTheDocument();
    expect(screen.getByText(/Prediction/i)).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('loads and displays statistics', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument(); // total_sightings
      expect(screen.getByText('8')).toBeInTheDocument(); // this_month
      expect(screen.getByText('7.5')).toBeInTheDocument(); // average_intensity
    });

    expect(apiService.getRainbowStats).toHaveBeenCalledTimes(1);
  });

  it('loads and displays recent rainbows', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Rainbow')).toBeInTheDocument();
      expect(screen.getByText('Another Rainbow')).toBeInTheDocument();
    });

    expect(apiService.getRecentRainbows).toHaveBeenCalledWith(5);
  });

  it('loads and displays weather data', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/20°C/)).toBeInTheDocument();
      expect(screen.getByText(/70%/)).toBeInTheDocument(); // humidity
      expect(screen.getByText(/1013/)).toBeInTheDocument(); // pressure
    });

    expect(apiService.getCurrentWeather).toHaveBeenCalledTimes(1);
  });

  it('loads and displays prediction data', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/75%/)).toBeInTheDocument(); // probability
      expect(screen.getByText(/85%/)).toBeInTheDocument(); // confidence
    });

    expect(apiService.getPredictionData).toHaveBeenCalledTimes(1);
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch data';
    apiService.getRainbowStats.mockRejectedValue(
      global.testUtils.createMockError(errorMessage)
    );

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading statistics/i)).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(apiService.getRainbowStats).toHaveBeenCalledTimes(2);
      expect(apiService.getRecentRainbows).toHaveBeenCalledTimes(2);
    });
  });

  it('navigates to rainbow details when rainbow is clicked', async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Rainbow')).toBeInTheDocument();
    });

    const rainbowCard = screen.getByText('Test Rainbow');
    fireEvent.click(rainbowCard);

    expect(mockNavigate).toHaveBeenCalledWith('/rainbow/1');
  });

  it('displays correct stats cards', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('total-sightings-card')).toBeInTheDocument();
      expect(screen.getByTestId('monthly-sightings-card')).toBeInTheDocument();
      expect(screen.getByTestId('average-intensity-card')).toBeInTheDocument();
      expect(screen.getByTestId('prediction-card')).toBeInTheDocument();
    });
  });

  it('updates time periodically', async () => {
    jest.useFakeTimers();
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('current-time')).toBeInTheDocument();
    });

    const initialTime = screen.getByTestId('current-time').textContent;

    // Fast-forward 1 minute
    jest.advanceTimersByTime(60000);

    await waitFor(() => {
      const updatedTime = screen.getByTestId('current-time').textContent;
      expect(updatedTime).not.toBe(initialTime);
    });

    jest.useRealTimers();
  });

  it('filters recent rainbows by intensity', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Rainbow')).toBeInTheDocument();
    });

    const intensityFilter = screen.getByRole('combobox', { name: /intensity/i });
    fireEvent.change(intensityFilter, { target: { value: '8' } });

    await waitFor(() => {
      // Should only show rainbows with intensity 8 or higher
      expect(screen.getByText('Test Rainbow')).toBeInTheDocument();
    });
  });

  it('displays weather condition icons', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      const weatherIcon = screen.getByTestId('weather-icon');
      expect(weatherIcon).toBeInTheDocument();
      expect(weatherIcon).toHaveAttribute('alt', 'partly_cloudy');
    });
  });

  it('shows rainbow probability chart', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('probability-chart')).toBeInTheDocument();
    });
  });

  it('handles empty recent rainbows', async () => {
    apiService.getRecentRainbows.mockResolvedValue(
      global.testUtils.createMockResponse([])
    );

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/No recent rainbows/i)).toBeInTheDocument();
    });
  });

  it('handles unauthorized access', async () => {
    const unauthorizedContext = {
      ...mockAuthContext,
      user: null,
      token: null
    };

    renderWithProviders(<Dashboard />, unauthorizedContext);

    expect(screen.getByText(/Please log in/i)).toBeInTheDocument();
  });

  it('auto-refreshes data every 5 minutes', async () => {
    jest.useFakeTimers();
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(apiService.getRainbowStats).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000);

    await waitFor(() => {
      expect(apiService.getRainbowStats).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('displays user greeting', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText(`Welcome back, ${mockAuthContext.user.name}!`)).toBeInTheDocument();
  });

  it('shows quick action buttons', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('button', { name: /Add Rainbow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View Analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
  });

  it('handles responsive layout', () => {
    // Mock window.matchMedia for mobile view
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    renderWithProviders(<Dashboard />);

    expect(screen.getByTestId('mobile-dashboard')).toBeInTheDocument();
  });
});