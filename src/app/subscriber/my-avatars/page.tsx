"use client";

import Link from 'next/link';
import { Bookmark, Store } from 'lucide-react';

export default function MyAvatarsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Avatars</h1>
      <p className="text-gray-500">Avatars you&apos;ve subscribed to will appear here.</p>
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <Bookmark size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium mb-2">No subscriptions yet</p>
        <p className="text-gray-400 text-sm mb-6">
          Browse the marketplace to find avatars and subscribe to them. Subscription management is coming in a future release.
        </p>
        <Link href="/subscriber/marketplace"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Store size={16} /> Browse Marketplace
        </Link>
      </div>
    </div>
  );
}
