// Setup file for React Testing Library
import '@testing-library/jest-dom';

// Mock axios for all tests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }) => children
}));

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  LineElement: jest.fn(),
  PointElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => <div data-testid="line-chart">{JSON.stringify({ data, options })}</div>,
  Bar: ({ data, options }) => <div data-testid="bar-chart">{JSON.stringify({ data, options })}</div>,
  Pie: ({ data, options }) => <div data-testid="pie-chart">{JSON.stringify({ data, options })}</div>
}));

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: jest.fn(),
    flyTo: jest.fn()
  })
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  icon: jest.fn(() => ({})),
  divIcon: jest.fn(() => ({})),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  latLngBounds: jest.fn(() => ({
    extend: jest.fn(),
    isValid: jest.fn(() => true)
  }))
}));

// Mock jwt-decode
jest.mock('jwt-decode', () => jest.fn(() => ({
  userId: 1,
  email: 'test@example.com',
  exp: Date.now() / 1000 + 3600
})));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  },
  Toaster: () => <div data-testid="toaster" />
}));

// Global test utilities
global.testUtils = {
  mockUser: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    token: 'mock-jwt-token'
  },
  
  mockRainbow: {
    id: 1,
    title: 'Test Rainbow',
    description: 'A test rainbow sighting',
    latitude: 36.2048,
    longitude: 138.2529,
    intensity: 8,
    image_url: '/uploads/test-rainbow.jpg',
    created_at: '2024-01-01T10:00:00Z',
    weather_conditions: {
      temperature: 22,
      humidity: 75,
      pressure: 1012
    }
  },

  mockWeatherData: {
    temperature: 20,
    humidity: 70,
    pressure: 1013,
    windSpeed: 5,
    cloudCover: 30,
    precipitation: 0,
    condition: 'partly_cloudy'
  },

  createMockResponse: (data, status = 200) => ({
    data,
    status,
    statusText: 'OK'
  }),

  createMockError: (message, status = 500) => ({
    response: {
      data: { success: false, message },
      status,
      statusText: 'Error'
    }
  })
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

// Console error suppression for test environment
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress React warnings and other test noise
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || 
       args[0].includes('React does not recognize') ||
       args[0].includes('Failed prop type'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});