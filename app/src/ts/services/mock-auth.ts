import { AuthService, User } from "./auth";

/**
 * MockAuthService for offline development.
 * Simulates biometric challenges and manages a mock session in localStorage.
 */
export class MockAuthService implements AuthService {
  private currentUser: User | null = null;
  private readonly STORAGE_KEY = "cdktn_mock_user";

  constructor() {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      }
    }
  }

  async biometricChallenge(): Promise<User> {
    console.log("🔐 Initializing biometric challenge...");
    
    // Simulate a 1.2s delay for the hardware sensor
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const mockUser: User = {
      id: "user_mock_123",
      email: "dev@cdktn.io",
      token: "mock_jwt_nebula_dark_session",
    };

    this.currentUser = mockUser;
    
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mockUser));
    }
    
    console.log("✅ Biometric authentication successful");
    return mockUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    console.log("👋 Signed out successfully");
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}
