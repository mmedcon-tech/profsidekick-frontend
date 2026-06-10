"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, Zap, ArrowRight, CheckCircle, LogOut } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Redirect authenticated users to their role dashboard immediately
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    if (user.role === 'admin')      router.replace('/admin/dashboard');
    else if (user.role === 'subscriber') router.replace('/subscriber/marketplace');
    else                            router.replace('/publisher/dashboard');
  }, [isAuthenticated, isLoading, user, router]);

  // Show spinner while auth check runs OR while redirect is in flight
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 dark:bg-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo.png" 
                alt="MyOS Logo" 
                className="w-10 h-10 object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">MyOS</span>
            </div>
            
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">
                    {user?.firstName} · <span className="capitalize font-medium text-emerald-900 dark:text-emerald-300">{user?.role}</span>
                  </span>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-sm"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors text-sm px-3 py-2 rounded-lg border border-gray-300 hover:border-red-300"
                  >
                    <LogOut size={15} />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:text-emerald-300 font-medium transition-colors text-sm px-3 py-2"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push('/register')}
                    className="bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-sm"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white dark:text-gray-100 mb-6">
              Transform Your <span className="text-emerald-700 dark:text-emerald-400">Teaching</span>
              <br />
              with AI-Powered Presentations
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              Upload your slides and let our AI teaching assistant help you deliver engaging, 
              interactive lessons with real-time voice support and intelligent content navigation.
            </p>
            
                         <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
               {isAuthenticated ? (
                 <button
                   onClick={() => router.push('/dashboard')}
                   className="bg-emerald-600 dark:bg-emerald-700 text-white px-8 py-4 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-600 dark:focus:ring-emerald-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                 >
                   Go to Dashboard
                   <ArrowRight className="w-5 h-5" />
                 </button>
               ) : (
                 <>
                   <button
                     onClick={() => router.push('/register')}
                     className="bg-emerald-600 dark:bg-emerald-700 text-white px-8 py-4 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-600 dark:focus:ring-emerald-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
                   >
                     Start Teaching for Free
                     <ArrowRight className="w-5 h-5" />
                   </button>
                   <button
                     onClick={() => router.push('/login')}
                     className="bg-white dark:bg-gray-900 dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 px-8 py-4 rounded-lg font-medium border border-emerald-600 dark:border-emerald-500 hover:bg-emerald-600 dark:bg-emerald-700/5 focus:ring-2 focus:ring-emerald-600 dark:focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
                   >
                     Sign In
                   </button>
                 </>
               )}
             </div>

                         {/* Coming Soon Badge */}
             <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
               <div className="bg-emerald-600 dark:bg-emerald-700/10 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-medium">
                 🚀 Currently in Development
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white dark:text-gray-100 mb-4">
              Everything You Need for Interactive Teaching
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Our AI-powered platform transforms static presentations into dynamic, engaging learning experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-emerald-600 dark:bg-emerald-700/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-4">Smart Content Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Upload PDF or PowerPoint slides and our AI instantly understands your content, 
                creating contextual assistance and navigation support.
              </p>
            </div>
            
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-4">AI Teaching Assistant</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Get real-time voice assistance, answer student questions naturally, 
                and navigate through your presentation with conversational commands.
              </p>
            </div>
            
            <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-4">Enhanced Engagement</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Create interactive learning experiences that keep students engaged 
                with AI-powered voice interactions and intelligent content delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Why Choose MyOS?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-2">Easy Setup</h3>
                    <p className="text-gray-600 dark:text-gray-400">Upload your presentation and start teaching in minutes. No complex setup or training required.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-2">Natural Voice Interaction</h3>
                    <p className="text-gray-600 dark:text-gray-400">Speak naturally to navigate slides, get explanations, and handle student questions seamlessly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-2">Customizable AI Assistant</h3>
                    <p className="text-gray-600 dark:text-gray-400">Configure voice, personality, and teaching style to match your preferences and subject matter.</p>
                  </div>
                </div>
              </div>
            </div>
                         <div className="bg-white dark:bg-gray-900 dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
               <div className="text-center">
                 {isAuthenticated ? (
                   <>
                     <h3 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-gray-100 mb-4">Welcome Back!</h3>
                     <p className="text-gray-600 dark:text-gray-400 mb-6">Ready to create your next amazing teaching session?</p>
                     <button
                       onClick={() => router.push('/dashboard')}
                       className="w-full bg-emerald-600 dark:bg-emerald-700 text-white px-8 py-4 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                     >
                       Go to Dashboard
                     </button>
                   </>
                 ) : (
                   <>
                     <h3 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-gray-100 mb-4">Ready to Get Started?</h3>
                     <p className="text-gray-600 dark:text-gray-400 mb-6">Be among the first educators to experience the future of AI-powered teaching.</p>
                     <button
                       onClick={() => router.push('/register')}
                       className="w-full bg-emerald-600 dark:bg-emerald-700 text-white px-8 py-4 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                     >
                       Create Free Account
                     </button>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">No credit card required</p>
                   </>
                 )}
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white dark:bg-gray-900 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white dark:text-gray-100 mb-4">
              Meet Our Team
            </h2>
            {/* <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Passionate educators and researchers working together to revolutionize the teaching experience.
            </p> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Professor 2 - Placeholder */}
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <img 
                  src="/images/team/alberto.jpg" 
                  alt="Alberto Gandolfi"
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-700 dark:from-emerald-600 to-emerald-800 dark:to-emerald-700 rounded-full items-center justify-center absolute top-0 left-0 hidden">
                  <span className="text-2xl font-bold text-white">AG</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-2">Alberto Gandolfi</h3>
              <p className="text-purple-600 font-medium mb-3">Professor of Practice in Mathematics at NYU Abu Dhabi</p>
              {/* <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Professor of Practice in Mathematics with extensive experience in educational technology 
                and AI applications in learning environments.
              </p> */}
            </div>

            {/* Professor 1 - Placeholder */}
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <img 
                  src="/images/team/eliseo.jpg" 
                  alt="Eliseo Ferrante"
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 dark:from-yellow-400 to-yellow-600 dark:to-yellow-500 rounded-full items-center justify-center absolute top-0 left-0 hidden">
                  <span className="text-2xl font-bold text-white">DR</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-2">Eliseo Ferrante</h3>
              <p className="text-green-600 font-medium mb-3">Visiting Professor at NYU Abu Dhabi</p>
              {/* <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Professor of Computer Science with extensive experience in educational technology 
                and AI applications in learning environments.
              </p> */}
            </div>

            <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <img 
                  src="/images/team/hanan.jpg" 
                  alt="Hanan Salam"
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 dark:from-yellow-400 to-yellow-600 dark:to-yellow-500 rounded-full items-center justify-center absolute top-0 left-0 hidden">
                  <span className="text-2xl font-bold text-white">DR</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-2">Hanan Salam</h3>
              <p className="text-teal-600 font-medium mb-3">Assistant Professor of Computer Science at NYU Abu Dhabi</p>
            </div>

            <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <img 
                  src="/images/team/assylbek.jpg" 
                  alt="Assylbek Saduakhassov"
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-600 dark:from-emerald-500 to-emerald-800 dark:to-emerald-700/80 rounded-full items-center justify-center absolute top-0 left-0 hidden">
                  <span className="text-2xl font-bold text-white">AS</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-gray-100 mb-2">Assylbek Saduakhassov</h3>
              <p className="text-emerald-700 dark:text-emerald-400 font-medium mb-3">Software Engineer</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/images/logo.png" 
                  alt="MyOS Logo" 
                  className="w-8 h-8 object-contain rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-xl font-bold">MyOS</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Empowering educators with AI-powered teaching tools to create more engaging and interactive learning experiences.
              </p>
            </div>
            
            {/* <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => router.push('/about')} className="hover:text-white transition-colors">About</button></li>
                <li><button onClick={() => router.push('/contact')} className="hover:text-white transition-colors">Contact</button></li>
              </ul>
            </div> */}
            
            <div>
              <h3 className="font-semibold mb-4">Account</h3>
              <ul className="space-y-2 text-gray-400">
                {isAuthenticated ? (
                  <li><button onClick={() => router.push('/dashboard')} className="hover:text-white transition-colors">Dashboard</button></li>
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
            <p>&copy; 2026 MyOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


