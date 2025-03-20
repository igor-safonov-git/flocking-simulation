import os
import logging
import json
from openai import OpenAI
from time import sleep
from threading import Lock

# Initialize OpenAI client
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

client = OpenAI(api_key=OPENAI_API_KEY)
ASSISTANT_ID = "asst_IshaBopCST637V2jWjNrN63C"

# Thread store with thread-safe access
thread_store = {}
thread_store_lock = Lock()

def handle_openai_error(e):
    """Handle OpenAI API errors with user-friendly messages"""
    error_msg = str(e)
    logging.error(f"OpenAI API error details: {error_msg}")

    if "insufficient_quota" in error_msg:
        return "OpenAI API quota exceeded. Please check your API usage limits and billing details."
    elif "429" in error_msg:  # Rate limit
        return "Too many requests. Please try again in a few seconds."
    elif "invalid_api_key" in error_msg:
        return "Invalid API key. Please check your OpenAI API key configuration."
    else:
        return "An error occurred while processing your request. Please try again later."

def check_moderation(text, max_retries=3):
    """
    Use OpenAI's Omni-moderation to check if the input is appropriate.
    Returns dict with 'passed' boolean and 'reason' if not passed.
    """
    for attempt in range(max_retries):
        try:
            logging.info(f"Attempting moderation check (attempt {attempt + 1}/{max_retries})")
            response = client.moderations.create(
                model="omni-moderation-latest",
                input=text
            )

            result = response.results[0]
            logging.debug(f"Moderation result: {result}")

            # If any category is flagged, reject the input
            if result.flagged:
                # Find which categories were flagged
                flagged_categories = [
                    category for category, flagged in result.categories.items() 
                    if flagged
                ]
                return {
                    'passed': False,
                    'reason': f"Content flagged for: {', '.join(flagged_categories)}"
                }

            return {'passed': True}

        except Exception as e:
            logging.warning(f"Moderation attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_retries - 1:  # Last attempt
                error_msg = handle_openai_error(e)
                raise Exception(error_msg)
            sleep(1)  # Wait before retrying

def get_assistant_response(text, conversation_id, max_retries=3, max_wait_seconds=30):
    """
    Process text using the specified assistant.
    Uses existing thread if conversation_id is found, creates new one if not.
    """
    for attempt in range(max_retries):
        try:
            logging.info(f"Attempting assistant processing (attempt {attempt + 1}/{max_retries})")

            # Thread management with locking
            with thread_store_lock:
                thread_id = thread_store.get(conversation_id)
                if not thread_id:
                    # Create new thread if none exists
                    thread = client.beta.threads.create()
                    thread_store[conversation_id] = thread.id
                    thread_id = thread.id
                    logging.info(f"Created new thread {thread_id} for conversation {conversation_id}")
                else:
                    logging.info(f"Using existing thread {thread_id} for conversation {conversation_id}")

            # Add the message to the thread
            message = client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=text
            )

            # Run the assistant
            run = client.beta.threads.runs.create(
                thread_id=thread_id,
                assistant_id=ASSISTANT_ID
            )

            # Wait for completion
            wait_start = 0
            while wait_start < max_wait_seconds:
                run_status = client.beta.threads.runs.retrieve(
                    thread_id=thread_id,
                    run_id=run.id
                )
                if run_status.status == 'completed':
                    # Get messages after completion
                    messages = client.beta.threads.messages.list(
                        thread_id=thread_id
                    )
                    # Get the last assistant message
                    for msg in messages:
                        if msg.role == "assistant":
                            return msg.content[0].text.value
                    break
                elif run_status.status == 'failed':
                    raise Exception("Assistant processing failed")
                sleep(1)
                wait_start += 1

            if wait_start >= max_wait_seconds:
                raise Exception("Assistant processing timeout")

        except Exception as e:
            logging.warning(f"Assistant processing attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_retries - 1:  # Last attempt
                error_msg = handle_openai_error(e)
                raise Exception(error_msg)
            sleep(1)  # Wait before retrying

def classify_input(text):
    """
    Classifies if input is safe and appropriate.
    Now uses moderation API as the only check.
    """
    # Check with omni-moderation
    moderation_result = check_moderation(text)
    return moderation_result

def process_with_instructions(text, conversation_id):
    """
    Processes the validated input using the specified assistant.
    """
    result = get_assistant_response(text, conversation_id)
    return result