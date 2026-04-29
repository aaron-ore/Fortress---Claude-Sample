import { supabase } from "@/lib/supabaseClient";
import { UserProfile } from "@/context/ProfileContext";

interface LogDetails {
  [key: string]: any;
}

export const logActivity = async (
  activityType: string,
  description: string,
  profile: UserProfile | null,
  details?: LogDetails,
  isError: boolean = false
) => {
  if (!profile || !profile.id || !profile.organizationId) {
    console.warn("Cannot log activity: User profile or organization ID missing.", { activityType, description, details, isError });
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn("Cannot log activity: User session missing.", { activityType, description, details, isError });
      return;
    }

    const edgeFunctionUrl = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/log-activity`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        activity_type: activityType,
        description: description,
        details: {
          ...details,
          is_error: isError,
          user_email: profile.email,
          user_full_name: profile.fullName,
        },
        user_id: profile.id,
        organization_id: profile.organizationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Failed to log activity via Edge Function: ${errorData.error || response.statusText}`, { activityType, description, details, isError });
    } else {
      // console.log(`Activity logged successfully: ${activityType} - ${description}`);
    }
  } catch (error) {
    console.error("Error calling log-activity Edge Function:", error, { activityType, description, details, isError });
  }
};