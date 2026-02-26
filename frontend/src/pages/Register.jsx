import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const { registerAsync, isRegistering } = useAuth();

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

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setErrors((prev) => ({ ...prev, submit: "" }));

    try {
      await registerAsync({ 
        name: formData.name, 
        email: formData.email, 
        password: formData.password 
      });
      
      navigate("/verify-email", { state: { email: formData.email } }); 
      
    } catch (error) {
      setErrors({
        submit:
          error?.response?.data?.message ||
          error?.message ||
          "Registration failed. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl">Create an Account</CardTitle>
          <CardDescription>Sign up to get started</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Ashwin"
                value={formData.name}
                onChange={handleInputChange}
                disabled={isRegistering}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ashwin@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isRegistering}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
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
                disabled={isRegistering}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={isRegistering}>
              {isRegistering ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <Separator className="my-4" />

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Sign in here
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}