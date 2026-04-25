/**
 * AuthService contract for the CDKTN Hello World app.
 * This abstraction allows us to swap between real Cognito and
 * a mock service for offline/local development.
 */
export interface User {
  id: string;
  email: string;
  token: string;
}

export interface AuthService {
  /**
   * Simulate or execute a biometric challenge (e.g., FaceID/TouchID).
   */
  biometricChallenge(): Promise<User>;

  /**
   * Log the current user out.
   */
  signOut(): Promise<void>;

  /**
   * Check if the user is currently authenticated.
   */
  isAuthenticated(): boolean;

  /**
   * Get the current user details.
   */
  getCurrentUser(): User | null;
}
