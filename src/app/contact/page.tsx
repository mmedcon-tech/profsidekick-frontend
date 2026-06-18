"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

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
                alt="ProfSidekick Logo" 
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
                  onClick={() => router.push('/dashboard')}
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
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
            Have questions about ProfSidekick? We would love to hear from you. 
            Send us a message and we will respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Send us a Message</h2>
              
              {isSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Message Sent!</h3>
                  <p className="text-gray-600 dark:text-gray-400">Thank you for contacting us. We will get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 transition-colors"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 transition-colors"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>
                  
                  {/* <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 transition-colors"
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="feature">Feature Request</option>
                      <option value="partnership">Partnership Opportunity</option>
                      <option value="other">Other</option>
                    </select>
                  </div> */}
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:border-primary/50 dark:border-primary/50 transition-colors resize-vertical"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary dark:bg-primary/90 text-white py-4 px-6 rounded-lg font-medium hover:bg-primary/90 dark:hover:bg-primary focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Contact Information</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  We are here to help! Reach out to us through any of these channels, 
                  and we will get back to you as quickly as possible.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 dark:bg-primary/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary/90 dark:text-primary/40" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Email Support</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Get help with technical issues or general questions</p>
                    <a href="mailto:support@profsidekick.com" className="text-primary/90 dark:text-primary/40 hover:text-primary/95 dark:text-primary/30 font-medium">
                      support@profsidekick.com
                    </a>
                  </div>
                </div>

                {/* <div className="flex items-start gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Live Chat</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Chat with our support team in real-time</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Available Monday - Friday, 9 AM - 6 PM PST</p>
                  </div>
                </div> */}

                <div className="flex items-start gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Phone Support</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Speak directly with our support team</p>
                    <p className="text-primary/90 dark:text-primary/40 font-medium">+1 (555) 123-4567</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monday - Friday, 9 AM - 6 PM PST</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Office Location</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      NYUAD<br />
                      Abu Dhabi, UAE<br />
                      United Arab Emirates
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Quick answers to common questions about ProfSidekick
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">How do I get started with ProfSidekick?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Simply create a free account, upload your presentation slides (PDF or PowerPoint), 
                configure your AI assistant settings, and start your first teaching session. 
                The entire process takes less than 5 minutes.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">What file formats are supported?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                ProfSidekick currently supports PDF files and PowerPoint presentations (PPTX). 
                We are working on adding support for Google Slides and other formats.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Is there a free trial available?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can create a free account and try ProfSidekick with up to 3 teaching sessions. 
                No credit card required for the trial.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">How does the AI understand my content?</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our AI uses advanced natural language processing to analyze your slides, 
                extracting key concepts, topics, and structure to provide contextual assistance 
                during your teaching sessions.
              </p>
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
                <li><button onClick={() => router.push('/about')} className="hover:text-white transition-colors">About</button></li>
              </ul>
            </div>
            
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
            <p>&copy; 2025 ProfSidekick. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 