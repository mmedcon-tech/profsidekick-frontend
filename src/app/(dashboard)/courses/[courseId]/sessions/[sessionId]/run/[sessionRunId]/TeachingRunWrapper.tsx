"use client";

import React, {  } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TeachingInterface from "@/components/teaching/TeachingInterface";
import { parseSessionRunAvatar } from "@/lib/sessionService";
import { SessionRunDetails } from "@/types/types";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
// import { config } from "@/lib/config";

interface TeachingRunWrapperProps {
  sessionRunDetails: SessionRunDetails;
  courseId: string;
  sessionId: string;
}

export default function TeachingRunWrapper({ sessionRunDetails, courseId, sessionId }: TeachingRunWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSharedLink = searchParams.get('shared') === 'true';
  const { token,  } = useAuth();

  // Check for previously stored slide position
  const getStoredSlidePosition = () => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`session_${sessionRunDetails.sessionRunId}_currentSlide`);
      if (stored) {
        const slideNum = parseInt(stored);
        if (slideNum >= 0 && slideNum < sessionRunDetails.slidesDetails.length) {
          console.log(`📚 Resuming from stored slide position: ${slideNum + 1}`);
          return slideNum;
        }
      }
    }
    return undefined;
  };

  const handleEndSession = async (metadata?: any) => {
    try {
      // Clear stored slide position when ending session
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`session_${sessionRunDetails.sessionRunId}_currentSlide`);
      }

      // Prepare headers based on user type
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Only add authorization for authenticated users
      if (token && !isSharedLink) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Choose stop endpoint based on whether this is a shared link or authenticated user
      const stopEndpoint = isSharedLink 
        ? `/api/sessions/${sessionRunDetails.sessionId}/run/${sessionRunDetails.sessionRunId}/stop/guest`
        : `/api/sessions/${sessionRunDetails.sessionId}/run/${sessionRunDetails.sessionRunId}/stop`;

      // Stop the session run
      await fetch(stopEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_run_metadata: metadata || {
            ended_by_user: true
          }
        }),
      });
    } catch (error) {
      console.error("Failed to end session run:", error);
    } finally {
      // Navigate back to session overview using new nested URL structure
      const returnUrl = isSharedLink 
        ? `/courses/${courseId}/sessions/${sessionId}?shared=true`
        : `/courses/${courseId}/sessions/${sessionId}`;
      router.push(returnUrl);
    }
  };

  // Transform SessionRunDetails to legacy ClassSession format for TeachingInterface compatibility
  const classSession = {
    sessionId: sessionRunDetails.sessionId,
    classDetails: {
      className: sessionRunDetails.className,
      courseName: sessionRunDetails.courseName,
      courseCode: sessionRunDetails.courseCode,
      description: sessionRunDetails.description || "",
      duration: sessionRunDetails.duration as any, // Convert to legacy duration type
      visionInstructions: "", // Add missing required property
      assistant_parameters: {
        input_audio_format: sessionRunDetails.assistantParameters.input_audio_format,
        input_audio_noice_reduction: sessionRunDetails.assistantParameters.input_audio_noise_reduction,
        input_audio_transcription: sessionRunDetails.assistantParameters.input_audio_transcription,
        instructions: sessionRunDetails.assistantParameters.instructions,
        model: sessionRunDetails.assistantParameters.model,
        output_audio_format: sessionRunDetails.assistantParameters.output_audio_format,
        temperature: sessionRunDetails.assistantParameters.temperature,
        tool_choice: sessionRunDetails.assistantParameters.tool_choice,
        tools: sessionRunDetails.assistantParameters.tools,
        turn_detection: sessionRunDetails.assistantParameters.turn_detection,
        voice: sessionRunDetails.assistantParameters.voice,
      },
    },
    processedContent: `Course: ${sessionRunDetails.courseName} (${sessionRunDetails.courseCode})\nClass: ${sessionRunDetails.className}\nDescription: ${sessionRunDetails.description || 'No description provided'}`,
    totalSlides: sessionRunDetails.slidesDetails.length,
    slides: sessionRunDetails.slidesDetails.map((slide, index) => ({
      id: slide.id,
      slideNumber: slide.slideNumber || index + 1,
      title: slide.title,
      content: slide.content,
      imagePath: slide.imagePath,
      thumbnailPath: slide.thumbnailPath,
    })),
    createdAt: sessionRunDetails.startTime,
    status: "RUNNING" as const,
  };

  const avatarConfig = parseSessionRunAvatar(sessionRunDetails);

  return (
    <ProtectedRoute requireAuth={!isSharedLink}>
      <TeachingInterface 
        classSession={classSession}
        onEndSession={handleEndSession}
        sessionRunId={sessionRunDetails.sessionRunId}
        startingSlide={getStoredSlidePosition()}
        avatarConfig={avatarConfig}
      />
    </ProtectedRoute>
  );
} 