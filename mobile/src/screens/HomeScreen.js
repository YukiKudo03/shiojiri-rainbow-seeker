import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { ApiService } from '../services/ApiService';
import { showMessage } from 'react-native-flash-message';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { location } = useLocation();
  const [rainbows, setRainbows] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRainbows(),
        loadWeatherData(),
        loadPrediction(),
      ]);
    } catch (error) {
      console.error('Load data error:', error);
      showMessage({
        message: 'Error loading data',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRainbows = async () => {
    try {
      const response = await ApiService.getRainbows(1, 10);
      if (response.data.success) {
        setRainbows(response.data.data);
      }
    } catch (error) {
      console.error('Load rainbows error:', error);
    }
  };

  const loadWeatherData = async () => {
    try {
      const response = await ApiService.getCurrentWeather();
      if (response.data.success) {
        setWeatherData(response.data.data);
      }
    } catch (error) {
      console.error('Load weather error:', error);
    }
  };

  const loadPrediction = async () => {
    try {
      const response = await ApiService.getRainbowPrediction();
      if (response.data.success) {
        setPrediction(response.data.data);
      }
    } catch (error) {
      console.error('Load prediction error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderRainbowItem = (rainbow) => (
    <TouchableOpacity
      key={rainbow.id}
      style={styles.rainbowCard}
      onPress={() => navigation.navigate('RainbowDetail', { rainbow })}
    >
      <View style={styles.rainbowHeader}>
        <Text style={styles.rainbowUser}>{rainbow.user_name}</Text>
        <Text style={styles.rainbowTime}>
          {new Date(rainbow.timestamp).toLocaleDateString()}
        </Text>
      </View>
      
      {rainbow.image_url && (
        <Image
          source={{ uri: rainbow.image_url }}
          style={styles.rainbowImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.rainbowContent}>
        <Text style={styles.rainbowDescription}>
          {rainbow.description || 'Rainbow sighting'}
        </Text>
        <View style={styles.rainbowLocation}>
          <Icon name="location-on" size={16} color="#666" />
          <Text style={styles.locationText}>
            {rainbow.latitude.toFixed(4)}, {rainbow.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderWeatherCard = () => (
    <View style={styles.weatherCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Current Weather</Text>
        <Icon name="wb-sunny" size={24} color="#FFA500" />
      </View>
      
      {weatherData ? (
        <View style={styles.weatherContent}>
          <View style={styles.weatherRow}>
            <Text style={styles.weatherLabel}>Temperature:</Text>
            <Text style={styles.weatherValue}>{weatherData.temperature}°C</Text>
          </View>
          <View style={styles.weatherRow}>
            <Text style={styles.weatherLabel}>Humidity:</Text>
            <Text style={styles.weatherValue}>{weatherData.humidity}%</Text>
          </View>
          <View style={styles.weatherRow}>
            <Text style={styles.weatherLabel}>Conditions:</Text>
            <Text style={styles.weatherValue}>{weatherData.weatherCondition}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noDataText}>Weather data unavailable</Text>
      )}
    </View>
  );

  const renderPredictionCard = () => (
    <View style={styles.predictionCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Rainbow Prediction</Text>
        <Text style={styles.rainbowEmoji}>🌈</Text>
      </View>
      
      {prediction ? (
        <View style={styles.predictionContent}>
          <View style={styles.probabilityContainer}>
            <Text style={styles.probabilityLabel}>Probability:</Text>
            <Text style={[
              styles.probabilityValue,
              { color: prediction.probability >= 70 ? '#10B981' : 
                       prediction.probability >= 50 ? '#F59E0B' : '#EF4444' }
            ]}>
              {prediction.probability}%
            </Text>
          </View>
          <Text style={styles.recommendationText}>
            {prediction.recommendation}
          </Text>
        </View>
      ) : (
        <Text style={styles.noDataText}>Prediction unavailable</Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {user?.name || 'Rainbow Seeker'}! 👋
        </Text>
        <Text style={styles.subtitle}>
          {location ? 'Ready to spot rainbows' : 'Location not available'}
        </Text>
      </View>

      {renderWeatherCard()}
      {renderPredictionCard()}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Rainbows</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Map')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {rainbows.length > 0 ? (
          rainbows.map(renderRainbowItem)
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No rainbows spotted yet</Text>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={() => navigation.navigate('Camera')}
            >
              <Text style={styles.captureButtonText}>Capture First Rainbow</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#6B46C1',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  weatherContent: {
    gap: 8,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  weatherValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  predictionContent: {
    gap: 12,
  },
  probabilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  probabilityLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  probabilityValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  recommendationText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  rainbowEmoji: {
    fontSize: 24,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6B46C1',
    borderRadius: 6,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rainbowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rainbowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  rainbowUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  rainbowTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  rainbowImage: {
    width: '100%',
    height: 200,
  },
  rainbowContent: {
    padding: 12,
  },
  rainbowDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  rainbowLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  captureButton: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;