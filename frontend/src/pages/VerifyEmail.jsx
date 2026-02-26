import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Grab the email and 'from' origin passed from the routing state
  const passedEmail = location.state?.email;
  const from = location.state?.from;

  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [resendMessage, setResendMessage] = useState("");
  
  // Use a ref to prevent double-firing the resend API in React Strict Mode
  const hasResent = useRef(false);

  const { 
    verifyOtpAsync, 
    isVerifyingOtp, 
    resendOtpAsync, 
    isResendingOtp 
  } = useAuth();

  // Redirect if no email is found in state
  useEffect(() => {
    if (!passedEmail) {
      navigate("/register");
    }
  }, [passedEmail, navigate]);

  // AUTOMATIC OTP RESEND: Only trigger if they came from the "login" page
  useEffect(() => {
    if (from === "login" && passedEmail && !hasResent.current) {
      hasResent.current = true; // Mark as sent so it doesn't fire twice
      
      const triggerResend = async () => {
        try {
          await resendOtpAsync({ email: passedEmail });
          setResendMessage("A fresh verification code has been sent to your email.");
        } catch (error) {
          setErrors((prev) => ({
            ...prev,
            submit: "Failed to automatically send a new code. Please click 'Resend Code'.",
          }));
        }
      };

      triggerResend();
    }
  }, [from, passedEmail, resendOtpAsync]);

  const handleInputChange = (e) => {
    setOtp(e.target.value);
    if (errors.otp) {
      setErrors((prev) => ({ ...prev, otp: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!otp) {
      newErrors.otp = "Verification code is required";
    } else if (otp.length < 4) { 
      newErrors.otp = "Please enter a valid code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setErrors((prev) => ({ ...prev, submit: "" }));

    try {
      await verifyOtpAsync({ 
        email: passedEmail, 
        otp: otp 
      });
      
      navigate("/login", { 
        state: { message: "Email verified successfully! Please log in." } 
      });
    } catch (error) {
      setErrors({
        submit:
          error?.response?.data?.message ||
          error?.message ||
          "Verification failed. Please check your code and try again.",
      });
    }
  };

  // MANUAL OTP RESEND: If the user clicks the "Resend Code" button
  const handleManualResend = async () => {
    setErrors((prev) => ({ ...prev, submit: "" }));
    setResendMessage("");
    
    try {
      await resendOtpAsync({ email: passedEmail });
      setResendMessage("A new verification code has been sent!");
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error?.response?.data?.message || "Failed to resend code. Please try again later.",
      }));
    }
  };

  // Prevent rendering the form briefly before the redirect happens if email is missing
  if (!passedEmail) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl">Check your email</CardTitle>
          <CardDescription>
            {from === "login" 
              ? "Please verify your email to log in." 
              : "We've sent a verification code to your inbox."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={passedEmail}
                disabled={true}
                className="bg-gray-100 text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                name="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={handleInputChange}
                disabled={isVerifyingOtp}
                maxLength={6} 
                className="text-center tracking-widest text-lg"
              />
              {errors.otp && <p className="text-sm text-red-500">{errors.otp}</p>}
            </div>

            {/* Display success messages for resending OTP */}
            {resendMessage && <p className="text-sm text-green-600 text-center">{resendMessage}</p>}
            
            {/* Display submission/API errors */}
            {errors.submit && <p className="text-sm text-red-500 text-center">{errors.submit}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={isVerifyingOtp}>
              {isVerifyingOtp ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          {/* Manual Resend Trigger */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Didn't receive a code?{" "}
            <button
              onClick={handleManualResend}
              disabled={isResendingOtp}
              className="text-blue-600 hover:text-blue-800 font-semibold disabled:text-gray-400"
            >
              {isResendingOtp ? "Sending..." : "Resend Code"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}