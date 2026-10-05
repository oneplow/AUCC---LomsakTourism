import { useState, useEffect } from 'react';

/**
 * Custom hook สำหรับจัดการรายการโปรด (favorites)
 * @param {number} placeId - ID ของสถานที่
 * @returns {object} - { isFavorite, toggleFavorite }
 */
export function useFavorite(placeId) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const syncFavorite = () => {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      setIsFavorite(favorites.includes(placeId));
    };

    syncFavorite();
    window.addEventListener('favorites-changed', syncFavorite);
    
    return () => window.removeEventListener('favorites-changed', syncFavorite);
  }, [placeId]);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const updated = favorites.includes(placeId)
      ? favorites.filter(id => id !== placeId)
      : [...favorites, placeId];
    
    localStorage.setItem('favorites', JSON.stringify(updated));
    setIsFavorite(updated.includes(placeId));
    window.dispatchEvent(new Event('favorites-changed'));
  };

  return { isFavorite, toggleFavorite };
}
