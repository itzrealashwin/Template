import React from "react";
import { Link } from "react-router-dom";

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-4">
        <h1 className="text-2xl font-bold">MyApp</h1>
        <div className="space-x-4">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg hover:bg-white hover:text-indigo-600 transition"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-200 transition"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center mt-32 px-6">
        <h2 className="text-5xl font-extrabold mb-6">
          Welcome to MyApp 🚀
        </h2>
        <p className="text-lg max-w-xl mb-8">
          Build something amazing with React, Tailwind and React Router.
          Simple. Fast. Modern.
        </p>

        <div className="space-x-4">
          <Link
            to="/register"
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:scale-105 transition"
          >
            Get Started
          </Link>

          <Link
            to="/login"
            className="px-6 py-3 border border-white rounded-xl hover:bg-white hover:text-indigo-600 transition"
          >
            Login
          </Link>
        </div>
      </div>

    </div>
  );
}

export default Landing;