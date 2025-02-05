import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Video, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <Video className="h-6 w-6 text-indigo-600" />
              <span className="ml-2 font-semibold text-xl">VideoSwiper</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/liked"
                  className="flex items-center text-gray-700 hover:text-indigo-600"
                >
                  <Heart className="h-5 w-5" />
                  <span className="ml-1">Liked</span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-gray-700 hover:text-indigo-600"
                  >
                    Admin
                  </Link>
                )}

                <button
                  onClick={() => signOut()}
                  className="flex items-center text-gray-700 hover:text-indigo-600"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="ml-1">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-indigo-600"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}