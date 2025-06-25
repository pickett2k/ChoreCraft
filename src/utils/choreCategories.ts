import { ChoreCategory } from '../services/firestoreService';

// Room Categories
export const ROOM_CATEGORIES: ChoreCategory[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: '🍳',
    color: '#FF6B6B',
    type: 'room',
    bonusCoins: 5
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: '🛏️',
    color: '#4ECDC4',
    type: 'room',
    bonusCoins: 4
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: '🚿',
    color: '#45B7D1',
    type: 'room',
    bonusCoins: 4
  },
  {
    id: 'living_room',
    name: 'Living Room',
    icon: '🛋️',
    color: '#96CEB4',
    type: 'room',
    bonusCoins: 4
  },
  {
    id: 'laundry',
    name: 'Laundry Room',
    icon: '👕',
    color: '#FFEAA7',
    type: 'room',
    bonusCoins: 3
  },
  {
    id: 'outdoor',
    name: 'Outdoor/Garden',
    icon: '🌱',
    color: '#81C784',
    type: 'room',
    bonusCoins: 5
  },
  {
    id: 'garage',
    name: 'Garage/Storage',
    icon: '🏠',
    color: '#B39DDB',
    type: 'room',
    bonusCoins: 3
  },
  {
    id: 'office',
    name: 'Office/Study',
    icon: '💻',
    color: '#FFB74D',
    type: 'room',
    bonusCoins: 3
  }
];

// Task Type Categories
export const TASK_CATEGORIES: ChoreCategory[] = [
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: '🧽',
    color: '#E91E63',
    type: 'task',
    bonusCoins: 6
  },
  {
    id: 'organizing',
    name: 'Organizing',
    icon: '📦',
    color: '#9C27B0',
    type: 'task',
    bonusCoins: 4
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    icon: '🔧',
    color: '#FF9800',
    type: 'task',
    bonusCoins: 5
  },
  {
    id: 'cooking',
    name: 'Cooking/Food Prep',
    icon: '👨‍🍳',
    color: '#FF5722',
    type: 'task',
    bonusCoins: 4
  },
  {
    id: 'shopping',
    name: 'Shopping/Errands',
    icon: '🛒',
    color: '#795548',
    type: 'task',
    bonusCoins: 3
  },
  {
    id: 'pet_care',
    name: 'Pet Care',
    icon: '🐕',
    color: '#607D8B',
    type: 'task',
    bonusCoins: 3
  },
  {
    id: 'childcare',
    name: 'Childcare',
    icon: '👶',
    color: '#F06292',
    type: 'task',
    bonusCoins: 5
  },
  {
    id: 'seasonal',
    name: 'Seasonal Tasks',
    icon: '🍂',
    color: '#8BC34A',
    type: 'task',
    bonusCoins: 4
  }
];

// Combined categories for easy access
export const ALL_CATEGORIES = [...ROOM_CATEGORIES, ...TASK_CATEGORIES];

// Helper functions
export const getCategoryById = (id: string): ChoreCategory | undefined => {
  return ALL_CATEGORIES.find(cat => cat.id === id);
};

export const getRoomCategories = (): ChoreCategory[] => {
  return ROOM_CATEGORIES;
};

export const getTaskCategories = (): ChoreCategory[] => {
  return TASK_CATEGORIES;
};

export const getCategoryColor = (categoryId?: string): string => {
  if (!categoryId) return '#9E9E9E';
  const category = getCategoryById(categoryId);
  return category?.color || '#9E9E9E';
};

export const getCategoryIcon = (categoryId?: string): string => {
  if (!categoryId) return '📋';
  const category = getCategoryById(categoryId);
  return category?.icon || '📋';
};

export const getCategoryName = (categoryId?: string): string => {
  if (!categoryId) return 'Uncategorized';
  const category = getCategoryById(categoryId);
  return category?.name || 'Uncategorized';
};

// Function to check if all chores in a category are completed for today
export const checkCategoryCompletion = (
  chores: any[], 
  categoryId: string, 
  categoryType: 'room' | 'task'
): { isComplete: boolean; totalChores: number; completedChores: number } => {
  const categoryChores = chores.filter(chore => {
    if (categoryType === 'room') {
      return chore.roomCategory === categoryId && chore.categoryBonusEligible;
    } else {
      return chore.taskCategory === categoryId && chore.categoryBonusEligible;
    }
  });

  const completedChores = categoryChores.filter(chore => 
    chore.status === 'completed' || chore.status === 'verified'
  );

  return {
    isComplete: categoryChores.length > 0 && completedChores.length === categoryChores.length,
    totalChores: categoryChores.length,
    completedChores: completedChores.length
  };
}; 