import React, { useState, useEffect, useCallback } from 'react';
import { Star, Heart, User, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Patient } from '../../types';

interface FavoritePatientsProps {
  onSelectPatient: (patient: Patient) => void;
  className?: string;
  maxDisplay?: number;
}

const STORAGE_KEY = 'hyacinth:favoritePatients';

interface FavoritePatientData {
  patientId: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  addedAt: string;
}

export const FavoritePatients: React.FC<FavoritePatientsProps> = ({
  onSelectPatient,
  className = '',
  maxDisplay = 5,
}) => {
  const [favorites, setFavorites] = useState<FavoritePatientData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFavorites(parsed);
      } catch (e) {
        console.error('Failed to parse favorite patients:', e);
      }
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const removeFromFavorites = useCallback((patientId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => prev.filter((f) => f.patientId !== patientId));
    if (selectedPatientId === patientId) {
      setSelectedPatientId(null);
    }
  }, [selectedPatientId]);

  const handleSelectPatient = useCallback(
    (favorite: FavoritePatientData) => {
      const patient: Patient = {
        id: favorite.patientId,
        chartNumber: favorite.chartNumber,
        firstName: favorite.firstName,
        lastName: favorite.lastName,
        dateOfBirth: new Date(favorite.dateOfBirth),
        allergies: [], // Will be loaded from server
      };
      setSelectedPatientId(favorite.patientId);
      onSelectPatient(patient);
    },
    [onSelectPatient]
  );

  const displayedFavorites = isExpanded ? favorites : favorites.slice(0, maxDisplay);
  const hasMore = favorites.length > maxDisplay;

  if (favorites.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-600">Favorite Patients</h3>
        </div>
        <p className="text-xs text-gray-500">
          Star patients to add them here for quick access
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <h3 className="text-sm font-semibold text-gray-800">
              Favorite Patients ({favorites.length})
            </h3>
          </div>
          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  Show Less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show All <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {displayedFavorites.map((favorite) => (
          <div
            key={favorite.patientId}
            onClick={() => handleSelectPatient(favorite)}
            className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors group ${
              selectedPatientId === favorite.patientId ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-1.5 rounded-full">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {favorite.firstName} {favorite.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Chart: {favorite.chartNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => removeFromFavorites(favorite.patientId, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                title="Remove from favorites"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Star button component for adding/removing patients from favorites
 */
interface FavoriteButtonProps {
  patient: Patient;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  onToggle?: (isFavorite: boolean) => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  patient,
  size = 'md',
  showText = false,
  onToggle,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const favorites: FavoritePatientData[] = JSON.parse(stored);
        setIsFavorite(favorites.some((f) => f.patientId === patient.id));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
  }, [patient.id]);

  const toggleFavorite = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let favorites: FavoritePatientData[] = [];
    
    if (stored) {
      try {
        favorites = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }

    if (isFavorite) {
      // Remove from favorites
      favorites = favorites.filter((f) => f.patientId !== patient.id);
      setIsFavorite(false);
      onToggle?.(false);
    } else {
      // Add to favorites
      const newFavorite: FavoritePatientData = {
        patientId: patient.id,
        chartNumber: patient.chartNumber,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth.toISOString(),
        addedAt: new Date().toISOString(),
      };
      favorites = [newFavorite, ...favorites].slice(0, 20);
      setIsFavorite(true);
      onToggle?.(true);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [isFavorite, patient, onToggle]);

  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <button
      onClick={toggleFavorite}
      className={`flex items-center gap-1.5 transition-colors ${
        isFavorite
          ? 'text-yellow-500 hover:text-yellow-600'
          : 'text-gray-400 hover:text-yellow-500'
      }`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`${sizeClasses[size]} ${isFavorite ? 'fill-current' : ''}`}
      />
      {showText && (
        <span className="text-sm">
          {isFavorite ? 'Favorited' : 'Add to Favorites'}
        </span>
      )}
    </button>
  );
};

/**
 * Hook for managing favorite patients
 */
export const useFavoritePatients = () => {
  const [favorites, setFavorites] = useState<FavoritePatientData[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
  }, []);

  const addFavorite = useCallback((patient: Patient) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.patientId === patient.id)) {
        return prev;
      }
      
      const newFavorite: FavoritePatientData = {
        patientId: patient.id,
        chartNumber: patient.chartNumber,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth.toISOString(),
        addedAt: new Date().toISOString(),
      };
      
      const updated = [newFavorite, ...prev].slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFavorite = useCallback((patientId: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((f) => f.patientId !== patientId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFavorite = useCallback(
    (patientId: string) => favorites.some((f) => f.patientId === patientId),
    [favorites]
  );

  const clearAllFavorites = useCallback(() => {
    setFavorites([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearAllFavorites,
    favoritesCount: favorites.length,
  };
};

export default FavoritePatients;
