import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { TranscriptProvider } from "@/contexts/TranscriptContext";
import { EventProvider } from "@/contexts/EventContext";
import TeachingRunWrapper from "./TeachingRunWrapper";
import { config } from "@/lib/config";


async function getSessionRunDetails(sessionId: string, sessionRunId: string) {
  try {
    const response = await fetch(config.getApiUrl(`/api/sessions/${sessionId}/run/${sessionRunId}`), {
      cache: 'no-store' // Ensure we get fresh data
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch session run details:', error);
    return null;
  }
}

export default async function SessionRunPage({ params }: { params: Promise<{ courseId: string, sessionId: string, sessionRunId: string }> }) {
  const { courseId, sessionId, sessionRunId } = await params;
  const sessionRunDetails = await getSessionRunDetails(sessionId, sessionRunId);

  if (!sessionRunDetails) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Loading teaching session...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <TeachingRunWrapper 
            sessionRunDetails={sessionRunDetails} 
            courseId={courseId}
            sessionId={sessionId}
          />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
} 