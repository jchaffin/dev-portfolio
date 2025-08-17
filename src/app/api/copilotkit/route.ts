import {
    CopilotRuntime,
    OpenAIAdapter,
    copilotRuntimeNextJSAppRouterEndpoint,
  } from '@copilotkit/runtime';
  
  import { NextRequest } from 'next/server';
   
  
  const serviceAdapter = new OpenAIAdapter();
  
  const runtime = new CopilotRuntime({
    actions: [
      {
        name: "send_email",
        description: "Open contact form to send an email to Jacob",
        parameters: [
          {
            name: "subject",
            type: "string",
            description: "Subject of the email",
            required: false,
          },
          {
            name: "context",
            type: "string", 
            description: "Context about what to discuss",
            required: false,
          }
        ],
        handler: async ({ subject, context }) => {
          return {
            success: true,
            action: "show_contact_form",
            form_data: { subject, context }
          };
        },
      },
      {
        name: "schedule_meeting",
        description: "Schedule a meeting with Jacob using Calendly",
        parameters: [
          {
            name: "meetingType",
            type: "string",
            description: "Type of meeting",
            required: false,
          }
        ],
        handler: async ({ meetingType }) => {
          return {
            success: true,
            action: "open_calendly",
            calendly_url: "https://calendly.com/jacobchaffin/general-meeting",
            meeting_details: { type: meetingType || 'general' }
          };
        },
      }
    ]
  });
   
  export const OPTIONS = async () => {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  };

  export const POST = async (req: NextRequest) => {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: '/api/copilotkit',
    });
   
    return handleRequest(req);
  };