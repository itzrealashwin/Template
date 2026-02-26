import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/api/auth.service.js';

// ============================================================================
// INDIVIDUAL HOOKS (Queries & Mutations)
// ============================================================================

export const useUser = () => {
    return useQuery({
        queryKey: ['authUser'], // The unique cache key for the user data
        queryFn: authService.me, 
        // We set retry to false because if /auth/me fails (e.g., 401 Unauthorized), 
        // we don't want TanStack Query to keep retrying a bad token.
        retry: false, 
    });
};

// --- REGISTRATION & OTP ---
export const useRegister = () => {
    return useMutation({
        mutationFn: (userData) => authService.register(userData),
    });
};

export const useVerifyOtp = () => {
    return useMutation({
        mutationFn: (otpData) => authService.verifyOtp(otpData),
    });
};

// --- LOGIN (Standard & Google) ---
export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (credentials) => authService.login(credentials),
        onSuccess: (data) => {
            // Save token from the response
            if (data.accessToken) {
                localStorage.setItem('token', data.accessToken);
            }
            // Trigger a fetch to get the user's profile data
            queryClient.invalidateQueries({ queryKey: ['authUser'] });
        },
    });
};

export const useGoogleLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (googleData) => authService.googleLogin(googleData),
        onSuccess: (data) => {
            if (data.accessToken) {
                localStorage.setItem('token', data.accessToken);
            }
            queryClient.invalidateQueries({ queryKey: ['authUser'] });
        },
    });
};

// --- PASSWORD RESET FLOW ---
export const useForgotPassword = () => {
    return useMutation({
        mutationFn: (emailData) => authService.forgotPassword(emailData),
    });
};

export const useVerifyResetOtp = () => {
    return useMutation({
        mutationFn: (otpData) => authService.verifyResetOtp(otpData),
    });
};

export const useResendOtp = ()=>{
    return useMutation({
        mutationFn: (emailData) => authService.resendOtp(emailData),
    });
}
export const useResetPassword = () => {
    return useMutation({
        mutationFn: (resetData) => authService.resetPassword(resetData),
    });
};

// --- LOGOUT ---
export const useLogout = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => authService.logout(),
        onSuccess: () => {
            localStorage.removeItem('token');
            queryClient.setQueryData(['authUser'], null);
            queryClient.clear(); // Clears all cached queries
        },
    });
};


// ============================================================================
// MAIN FACADE HOOK (For clean UI components)
// ============================================================================

export const useAuth = () => {
    // 1. Get current user state
    const { 
        data: user, 
        isLoading: isUserLoading, 
        isError,
        isFetching 
    } = useUser();

    // 2. Get primary mutations
    const loginMutation = useLogin();
    const logoutMutation = useLogout();
    const registerMutation = useRegister();
    const verifyOtpMutation = useVerifyOtp();
    const googleLoginMutation = useGoogleLogin();
    const forgotPasswordMutation = useForgotPassword();
    const verifyResetOtpMutation = useVerifyResetOtp();
    const resetPasswordMutation = useResetPassword();
    const resendOtpMutation = useResendOtp();
    // 3. Derive authentication status
    const isAuthenticated = !!user && !isError;

    return {
        // User State
        user,
        isAuthenticated,
        isLoading: isUserLoading || isFetching, 

        // Login Actions & State
        login: loginMutation.mutate,
        loginAsync: loginMutation.mutateAsync, 
        isLoggingIn: loginMutation.isPending,
        loginError: loginMutation.error,

        // Google Login Actions & State
        googleLogin: googleLoginMutation.mutate,
        googleLoginAsync: googleLoginMutation.mutateAsync,
        isGoogleLoggingIn: googleLoginMutation.isPending,

        // Register Actions & State
        register: registerMutation.mutate,
        registerAsync: registerMutation.mutateAsync,
        isRegistering: registerMutation.isPending,
        registerError: registerMutation.error,

        // Verify OTP Actions & State
        verifyOtp: verifyOtpMutation.mutate,
        verifyOtpAsync: verifyOtpMutation.mutateAsync,
        isVerifyingOtp: verifyOtpMutation.isPending,
        verifyOtpError: verifyOtpMutation.error,

        // Resend OTP Actions & State
        resendOtpMutation: resendOtpMutation.mutate,
        resendOtpAsync: resendOtpMutation.mutateAsync,
        isResendingOtp: resendOtpMutation.isPending,
        resendOtpError: resendOtpMutation.error,

        // Password Reset Flow Actions & State
        forgotPassword: forgotPasswordMutation.mutate,
        forgotPasswordAsync: forgotPasswordMutation.mutateAsync,
        isSendingForgotEmail: forgotPasswordMutation.isPending,

        verifyResetOtp: verifyResetOtpMutation.mutate,
        verifyResetOtpAsync: verifyResetOtpMutation.mutateAsync,
        isVerifyingResetOtp: verifyResetOtpMutation.isPending,

        resetPassword: resetPasswordMutation.mutate,
        resetPasswordAsync: resetPasswordMutation.mutateAsync,
        isResettingPassword: resetPasswordMutation.isPending,

        // Logout Actions & State
        logout: logoutMutation.mutate,
        isLoggingOut: logoutMutation.isPending,
    };
};