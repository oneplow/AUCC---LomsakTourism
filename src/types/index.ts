// ============================================
// Database Entity Types
// ============================================

export interface Category {
  category_id: number;
  name: string;
  created_at: string;
}

export interface Place {
  place_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  history: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  open_time: string | null;
  close_time: string | null;
  /** วันเปิด "0,6" (0 = อาทิตย์), null = เปิดทุกวัน */
  open_days: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceImage {
  image_id: number;
  place_id: number;
  image_url: string;
  created_at: string;
}

export interface User {
  user_id: number;
  username: string;
  password: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'staff';
  created_at: string;
  updated_at: string;
}

export interface StaffPermission {
  permission_id: number;
  user_id: number;
  place_id: number;
  created_at: string;
}

export interface PlaceVisit {
  visit_id: number;
  place_id: number;
  visited_at: string;
}

export interface TripPlan {
  trip_id: number;
  days: number;
  budget: number;
  start_time: string;
  end_time: string;
  place_types: string;
  plan_result: TripPlanResult | null;
  created_at: string;
}

// ============================================
// Extended Types (with joins/relations)
// ============================================

export interface PlaceWithCategory extends Place {
  category_name?: string;
}

export interface PlaceWithImages extends Place {
  images?: PlaceImage[];
  category_name?: string;
}

export interface UserWithPermissions extends Omit<User, 'password'> {
  permissions?: StaffPermission[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    user_id: number;
    username: string;
    full_name: string | null;
    email: string | null;
    role: 'admin' | 'staff';
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// ============================================
// Trip Planner Types
// ============================================

export interface TripPlanRequest {
  days: number;
  budget: number;
  startTime: string;
  endTime: string;
  placeTypes: string[];
}

export interface TripPlanResult {
  itinerary: DayItinerary[];
  totalBudget: number;
  totalPlaces: number;
  summary?: string;
}

export interface DayItinerary {
  day: number;
  date?: string;
  places: PlannedPlace[];
  totalDistance?: number;
  estimatedCost?: number;
}

export interface PlannedPlace {
  place_id: number;
  name: string;
  description?: string;
  category_name?: string;
  latitude: number;
  longitude: number;
  visitDuration?: number;
  estimatedCost?: number;
  arrivalTime?: string;
  departureTime?: string;
}

// ============================================
// Form Input Types
// ============================================

export interface PlaceFormData {
  category_id: number;
  name: string;
  description: string;
  history?: string;
  address: string;
  latitude: number;
  longitude: number;
  open_time?: string;
  close_time?: string;
  open_days?: string;
  phone?: string;
}

export interface UserFormData {
  username: string;
  password?: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'staff';
}

export interface CategoryFormData {
  name: string;
}

// ============================================
// Component Props Types
// ============================================

export interface PlaceCardProps {
  place: PlaceWithImages;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  onEdit?: (place: PlaceWithImages) => void;
  onDelete?: (placeId: number) => void;
}

export interface MapViewProps {
  places: Place[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (place: Place) => void;
}

export interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithoutPassword<T extends { password?: string }> = Omit<T, 'password'>;
