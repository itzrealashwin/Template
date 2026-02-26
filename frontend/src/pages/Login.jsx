import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import GoogleAuthButton from "@/components/GoogleAuthButton";
export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const { loginAsync, isLoggingIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setErrors((prev) => ({ ...prev, submit: "" }));

    try {
      // If loginAsync succeeds, the user is authenticated and verified
      await loginAsync({ email: formData.email, password: formData.password });

      // Proceed to the main app
      navigate("/");
    } catch (error) {
      // Check if the backend rejected the login because the email isn't verified
      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        navigate("/verify-email", {
          state: {
            email: formData.email,
            from: "login",
          },
        });

        return; // Stop execution here so we don't set a UI error message
      }

      // For all other errors (wrong password, server down, etc.), show the error message
      setErrors({
        submit:
          error?.response?.data?.message ||
          error?.message ||
          "Login failed. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl">Welcome</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoggingIn}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoggingIn}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {errors.submit && (
              <p className="text-sm text-red-500">{errors.submit}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Signing in..." : "Login"}
            </Button>
          </form>
          <Separator className="my-4" />

          <GoogleAuthButton />

          <Separator className="my-4" />

          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Sign up here
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
