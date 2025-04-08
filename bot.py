import os
import re
import logging
from typing import List, Optional
from urllib.parse import urlparse

import openai
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from bs4 import BeautifulSoup
import requests

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai.api_key = os.getenv('OPENAI_API_KEY')

# Telegram Bot Token
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')

def extract_links(text: str) -> List[str]:
    """Extract up to 5 URLs from the given text."""
    url_pattern = r'https?://[^\s<>"]+|www\.[^\s<>"]+'
    urls = re.findall(url_pattern, text)
    return urls[:5]

async def get_article_content(url: str) -> str:
    """Fetch and parse article content from URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Try to get title
        title = soup.title.string if soup.title else url
        
        # Try to get main content
        content = ""
        for tag in ['article', 'main', 'div']:
            content_tag = soup.find(tag)
            if content_tag:
                content = content_tag.get_text(strip=True)
                break
        
        if not content:
            content = soup.get_text(strip=True)
            
        return f"Title: {title}\n\nContent: {content[:2000]}"  # Limit content length
    except Exception as e:
        logger.error(f"Error fetching article content: {e}")
        return ""

async def generate_summary(content: str) -> str:
    """Generate a summary using OpenAI API."""
    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes articles in 150 words or less."},
                {"role": "user", "content": f"Please summarize the following article in 150 words or less:\n\n{content}"}
            ],
            max_tokens=200
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return f"Error generating summary: {str(e)}"

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle incoming messages."""
    if not update.message:
        return

    # Check if bot is mentioned
    if context.bot.username not in update.message.text:
        return

    # Get message text and replied message if any
    message_text = update.message.text
    replied_message = update.message.reply_to_message
    all_text = message_text

    if replied_message and replied_message.text:
        all_text += "\n" + replied_message.text

    # Extract links
    links = extract_links(all_text)
    
    if not links:
        await update.message.reply_text("There's no links in the message")
        return

    # Process each link
    for link in links:
        try:
            # Get article content
            content = await get_article_content(link)
            if not content:
                await update.message.reply_text(f"Could not fetch content from {link}")
                continue

            # Generate summary
            summary = await generate_summary(content)
            
            # Format response
            response = f"*{content.split('Title: ')[1].split('\n')[0]}*\n\n{link}\n\n{summary}"
            
            # Send summary
            await update.message.reply_text(response, parse_mode='Markdown')
            
        except Exception as e:
            await update.message.reply_text(f"Error processing {link}: {str(e)}")

def main() -> None:
    """Start the bot."""
    if not TELEGRAM_TOKEN:
        logger.error("TELEGRAM_TOKEN not found in environment variables")
        return
    if not openai.api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return

    # Create the Application
    application = Application.builder().token(TELEGRAM_TOKEN).build()

    # Add handlers
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Start the Bot
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
