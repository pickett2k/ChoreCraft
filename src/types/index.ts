export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  householdId?: string;
  role: 'admin' | 'member';
  isPremium: boolean;
  coins: number;
  realBalance: number; // GBP
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  totalCoinsEarned?: number;
  stats?: {
    choresCompleted: number;
    rewardsClaimed: number;
    currentStreak: number;
    longestStreak: number;
  };
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: string[];
  settings: {
    rewardType: 'coins' | 'gbp';
    coinValue: number; // How much 1 coin is worth in GBP
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFrequency {
  days: string[]; // ['monday', 'wednesday', 'friday']
  time: string; // '09:00'
}

export interface ChoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'room' | 'task';
}

export interface Chore {
  id: string;
  householdId: string;
  title: string;
  description: string;
  assignedTo?: string[]; // If empty, anyone can complete
  createdBy: string;
  rewardValue: number;
  rewardType: 'coins' | 'gbp';
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customFrequency?: CustomFrequency; // Only when frequency is 'custom'
  dueDate?: Date;
  status: 'pending' | 'completed' | 'verified';
  requiresPhoto: boolean;
  beforePhoto?: string;
  afterPhoto?: string;
  completedBy?: string;
  completedAt?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  cleanupAfterDays: number; // Auto-deletion after completion
  deleteAt?: Date; // Set when completed, for auto-cleanup
  createdAt: Date;
  updatedAt: Date;
  
  // Category fields
  roomCategory?: string; // e.g., 'kitchen', 'bedroom'
  taskCategory?: string; // e.g., 'cleaning', 'maintenance'
  categoryBonusEligible?: boolean; // Whether this chore counts toward category completion bonus
}

export interface Reward {
  id: string;
  userId: string;
  householdId: string;
  choreId: string;
  type: 'coins' | 'gbp';
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  householdId: string;
  amount: number;
  type: 'coins' | 'gbp';
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
}

// New reward system types
export interface MarketplaceReward {
  id: string;
  title: string;
  description: string;
  coinCost: number;
  category: 'entertainment' | 'treats' | 'privileges' | 'money' | 'experiences' | 'items';
  isActive: boolean;
  createdBy: string;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Popularity tracking
  requestCount: number;
  lastRequested?: Date;
  
  // Availability
  maxRedemptions?: number; // null = unlimited
  currentRedemptions: number;
  cooldownHours?: number; // Hours before can be redeemed again
  
  // Metadata
  ageRestriction?: number;
  requiresApproval: boolean;
  icon?: string;
  color?: string;
}

export interface MarketplaceRewardRequest {
  id: string;
  rewardId: string;
  userId: string;
  householdId: string;
  coinCost: number;
  status: 'pending' | 'approved' | 'denied' | 'fulfilled';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
  
  // Reward snapshot (in case reward is deleted)
  rewardSnapshot: {
    title: string;
    description: string;
    category: string;
  };
}

export interface PopularReward {
  title: string;
  description: string;
  category: string;
  averageCoinCost: number;
  requestFrequency: number;
  icon?: string;
  color?: string;
}

export interface Achievement {
  id: string;
  userId: string;
  type: 'streak' | 'completion' | 'milestone';
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}

export interface NavigationParams {
  Home: undefined;
  Chores: undefined;
  Profile: { userId?: string };
  CreateChore: undefined;
  ChoreDetails: { choreId: string };
  Household: undefined;
  CreateHousehold: undefined;
  JoinHousehold: undefined;
  Login: undefined;
  Register: undefined;
}

export type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

export type ChoreFormData = {
  title: string;
  description: string;
  assignedTo?: string[];
  rewardValue: number;
  rewardType: 'coins' | 'gbp';
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customFrequency?: CustomFrequency;
  dueDate?: Date;
  requiresPhoto: boolean;
  beforePhoto?: string;
}; 