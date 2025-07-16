import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLocation } from '../context/LocationContext';
import { ApiService } from '../services/ApiService';
import { showMessage } from 'react-native-flash-message';

const MapScreen = ({ navigation }) => {
  const [rainbows, setRainbows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 36.1127,
    longitude: 137.9545,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const { location, updateLocation } = useLocation();

  useEffect(() => {
    loadNearbyRainbows();
    
    if (location) {
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [location]);

  const loadNearbyRainbows = async () => {
    setLoading(true);
    try {
      const currentLocation = location || { latitude: 36.1127, longitude: 137.9545 };
      const response = await ApiService.getNearbyRainbows(
        currentLocation.latitude,
        currentLocation.longitude,
        50 // 50km radius
      );
      
      if (response.data.success) {
        setRainbows(response.data.data);
      }
    } catch (error) {
      console.error('Load nearby rainbows error:', error);
      showMessage({
        message: 'Failed to load nearby rainbows',
        type: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (rainbow) => {
    navigation.navigate('RainbowDetail', { rainbow });
  };

  const handleMyLocationPress = async () => {
    try {
      await updateLocation();
      if (location) {
        setMapRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get your location');
    }
  };

  const handleRefresh = () => {
    loadNearbyRainbows();
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* Show user location circle */}
        {location && (
          <Circle
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={1000}
            fillColor="rgba(107, 70, 193, 0.1)"
            strokeColor="rgba(107, 70, 193, 0.5)"
            strokeWidth={2}
          />
        )}

        {/* Show rainbow markers */}
        {rainbows.map((rainbow) => (
          <Marker
            key={rainbow.id}
            coordinate={{
              latitude: rainbow.latitude,
              longitude: rainbow.longitude,
            }}
            title={rainbow.description || 'Rainbow Sighting'}
            description={`By ${rainbow.user_name} • ${new Date(rainbow.timestamp).toLocaleDateString()}`}
            onPress={() => handleMarkerPress(rainbow)}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerEmoji}>🌈</Text>
            </View>
          </Marker>
        ))}

        {/* Show Shiojiri center */}
        <Marker
          coordinate={{
            latitude: 36.1127,
            longitude: 137.9545,
          }}
          title="Shiojiri City Center"
          description="Main area for rainbow sightings"
        >
          <View style={styles.centerMarker}>
            <Icon name="location-city" size={24} color="#6B46C1" />
          </View>
        </Marker>
      </MapView>

      {/* Control buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleMyLocationPress}
        >
          <Icon name="my-location" size={24} color="#6B46C1" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleRefresh}
        >
          <Icon name="refresh" size={24} color="#6B46C1" />
        </TouchableOpacity>
      </View>

      {/* Info panel */}
      <View style={styles.infoPanel}>
        <View style={styles.infoPanelHeader}>
          <Text style={styles.infoPanelTitle}>Rainbow Sightings</Text>
          <Text style={styles.infoPanelCount}>{rainbows.length} found</Text>
        </View>
        
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <Text style={styles.legendEmoji}>🌈</Text>
            <Text style={styles.legendText}>Rainbow Sighting</Text>
          </View>
          <View style={styles.legendItem}>
            <Icon name="location-city" size={16} color="#6B46C1" />
            <Text style={styles.legendText}>Shiojiri Center</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerEmoji: {
    fontSize: 24,
  },
  centerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  controlsContainer: {
    position: 'absolute',
    right: 20,
    top: 100,
    gap: 10,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  infoPanelCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendEmoji: {
    fontSize: 16,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default MapScreen;