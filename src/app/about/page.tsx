"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Users, Lightbulb, Award } from 'lucide-react';

export default function AboutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const dashboardUrl = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'publisher' ? '/publisher/dashboard' : '/subscriber/dashboard';

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-primary/50 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img
                src="/images/logo.png"
                alt="Myos Logo"
                className="w-10 h-10 object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-2xl font-bold text-primary dark:text-primary/10">ProfSidekick</span>
            </button>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
              {isAuthenticated ? (
                <button
                  onClick={() => router.push(dashboardUrl)}
                  className="bg-primary dark:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 dark:hover:bg-primary transition-colors"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="bg-primary dark:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 dark:hover:bg-primary transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            About ProfSidekick
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
            We are on a mission to revolutionize education by empowering educators with
            cutting-edge AI technology that makes teaching more interactive, engaging, and effective.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"> */}
          <div className="text-center">
            {/* <div>
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-8 h-8 text-primary/90 dark:text-primary/40" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Our Mission</h2>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                Education is the foundation of progress, yet many educators struggle with outdated tools 
                and one-size-fits-all approaches. We believe that every teacher deserves access to 
                intelligent, adaptive technology that enhances their natural teaching abilities.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                ProfSidekick bridges the gap between traditional presentations and interactive learning 
                by providing AI-powered assistance that understands your content and responds to your 
                teaching style in real-time.
              </p>
            </div> */}
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-primary dark:text-primary/10 mb-4">🚀 Coming Soon</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  We are building something amazing for educators worldwide.
                  ProfSidekick is currently in active development.
                </p>
                {/* <div className="grid grid-cols-2 gap-4 text-center">
                   <div>
                     <div className="text-2xl font-bold text-primary/90 dark:text-primary/40 mb-1">✨</div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">AI-Powered</div>
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-primary/90 dark:text-primary/40 mb-1">🎯</div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Educator-Focused</div>
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-primary/90 dark:text-primary/40 mb-1">🔮</div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Future-Ready</div>
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-primary/90 dark:text-primary/40 mb-1">💡</div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Innovative</div>
                   </div>
                 </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              The principles that guide everything we do at ProfSidekick
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="w-16 h-16 bg-primary/10 dark:bg-primary/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-8 h-8 text-primary/90 dark:text-primary/40" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Innovation</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We continuously push the boundaries of what is possible in educational technology,
                bringing cutting-edge AI capabilities to everyday teaching scenarios.
              </p>
            </div>

            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Accessibility</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Great teaching tools should be available to everyone. We are committed to making
                advanced AI technology accessible and affordable for educators worldwide.
              </p>
            </div>

            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Excellence</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We hold ourselves to the highest standards, ensuring that every feature we build
                genuinely improves the teaching and learning experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      {/* <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">Our Story</h2>
            <div className="prose prose-lg mx-auto text-gray-600 dark:text-gray-400">
              <p className="mb-6">
                ProfSidekick was born from a simple observation: despite decades of technological advancement, 
                most classroom presentations still rely on static slides and one-way communication. 
                Educators wanted more interactive, engaging ways to connect with their students, but 
                existing tools were either too complex or too limited.
              </p>
              <p className="mb-6">
                Our founding team, comprised of educators, technologists, and AI researchers, came together 
                with a shared vision: what if we could create an AI assistant that truly understood 
                educational content and could help teachers deliver more dynamic, responsive lessons?
              </p>
              <p className="mb-6">
                After months of research, development, and testing with real educators, ProfSidekick emerged 
                as the first AI-powered teaching assistant that seamlessly integrates with your existing 
                presentations to create truly interactive learning experiences.
              </p>
                             <p>
                 Today, we are actively developing ProfSidekick with the vision of serving educators worldwide, 
                 from K-12 teachers to university professors, helping them transform their classrooms into engaging, 
                 AI-enhanced learning environments. We're currently in the development phase, building something truly special.
               </p>
            </div>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      {/* <section className="py-20 bg-primary dark:bg-primary/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Teaching?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of educators who are already using ProfSidekick to create more engaging lessons.
          </p>
                     <div className="flex flex-col sm:flex-row gap-4 justify-center">
             {isAuthenticated ? (
               <button
                 onClick={() => router.push(dashboardUrl)}
                 className="bg-white dark:bg-gray-800 text-primary/90 dark:text-primary/40 px-8 py-4 rounded-lg font-medium hover:bg-gray-100 dark:bg-gray-800 transition-colors"
               >
                 Go to Dashboard
               </button>
             ) : (
               <button
                 onClick={() => router.push('/register')}
                 className="bg-white dark:bg-gray-800 text-primary/90 dark:text-primary/40 px-8 py-4 rounded-lg font-medium hover:bg-gray-100 dark:bg-gray-800 transition-colors"
               >
                 Get Started Free
               </button>
             )}
             <button
               onClick={() => router.push('/contact')}
               className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-medium hover:bg-white dark:bg-gray-800 hover:text-primary/90 dark:text-primary/40 transition-colors"
             >
               Contact Us
             </button>
           </div>
        </div>
      </section> */}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/images/logo.png"
                  alt="ProfSidekick Logo"
                  className="w-8 h-8 object-contain rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-xl font-bold">ProfSidekick</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Empowering educators with AI-powered teaching tools to create more engaging and interactive learning experiences.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => router.push('/')} className="hover:text-white transition-colors">Home</button></li>
                <li><button onClick={() => router.push('/contact')} className="hover:text-white transition-colors">Contact</button></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Account</h3>
              <ul className="space-y-2 text-gray-400">
                {isAuthenticated ? (
                  <li><button onClick={() => router.push(dashboardUrl)} className="hover:text-white transition-colors">Dashboard</button></li>
                ) : (
                  <>
                    <li><button onClick={() => router.push('/login')} className="hover:text-white transition-colors">Sign In</button></li>
                    <li><button onClick={() => router.push('/register')} className="hover:text-white transition-colors">Register</button></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ProfSidekick. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 