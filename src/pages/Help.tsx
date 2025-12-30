import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Search, ChevronDown, MessageCircle, 
  Shield, Heart, MapPin, Camera, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQCategory {
  icon: React.ElementType;
  title: string;
  questions: { q: string; a: string }[];
}

const faqCategories: FAQCategory[] = [
  {
    icon: Heart,
    title: 'Getting Started',
    questions: [
      { 
        q: 'How do I create an account?', 
        a: 'Tap "Register" on the login screen and fill in your details. You\'ll need to verify your email before you can start using the app.' 
      },
      { 
        q: 'How do I find matches?', 
        a: 'Use Local Mode to find people nearby, or Global Mode to connect with anyone around the world. Swipe right on profiles you like!' 
      },
      { 
        q: 'Can I use Connect without sharing my location?', 
        a: 'Location is required for Local Mode to find nearby users. However, you can use Global Mode without sharing your exact location.' 
      },
    ],
  },
  {
    icon: Camera,
    title: 'Profile & Photos',
    questions: [
      { 
        q: 'How do I add photos to my profile?', 
        a: 'Go to your Profile, tap Edit Profile, then tap the photo slots to upload new images. You can add up to 6 photos.' 
      },
      { 
        q: 'What are private photos?', 
        a: 'Private photos are only visible to users you specifically share your album with. Others will see a blurred preview.' 
      },
      { 
        q: 'How do I share my private album?', 
        a: 'Go to Album Management > Album Sharing. You can request to share with other users or manage existing shares.' 
      },
    ],
  },
  {
    icon: MessageCircle,
    title: 'Messaging',
    questions: [
      { 
        q: 'How do I start a conversation?', 
        a: 'After matching with someone, tap the message icon on their profile or find them in your Messages tab.' 
      },
      { 
        q: 'Can I send photos in chat?', 
        a: 'Yes! Tap the image icon in the chat input to share photos with your matches.' 
      },
      { 
        q: 'Why can\'t I message someone?', 
        a: 'You can only message users you\'ve matched with, or users you\'ve connected with in Global Mode.' 
      },
    ],
  },
  {
    icon: Shield,
    title: 'Safety & Privacy',
    questions: [
      { 
        q: 'How do I block someone?', 
        a: 'Open their profile, tap the menu icon (three dots), and select "Block User". They won\'t be able to see your profile or contact you.' 
      },
      { 
        q: 'How do I report inappropriate behavior?', 
        a: 'Tap the report button on any profile or message. Our team reviews all reports within 24 hours.' 
      },
      { 
        q: 'Is my data secure?', 
        a: 'Yes! We use industry-standard encryption to protect your data. See our Privacy Policy for more details.' 
      },
    ],
  },
  {
    icon: MapPin,
    title: 'Local & Global Mode',
    questions: [
      { 
        q: 'What\'s the difference between Local and Global Mode?', 
        a: 'Local Mode shows users near your current location. Global Mode randomly matches you with users from anywhere in the world.' 
      },
      { 
        q: 'How accurate is the distance shown?', 
        a: 'Distance is calculated based on your last known location and is approximate to protect privacy.' 
      },
      { 
        q: 'Can I search for users in a specific city?', 
        a: 'Yes! In Local Mode, tap the search icon to browse users in any city.' 
      },
    ],
  },
];

export default function Help() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass safe-area-top">
        <div className="flex items-center px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground ml-4">Help Center</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help..."
            className="pl-12 h-12 bg-card border-border rounded-xl"
          />
        </motion.div>

        {/* Contact Support */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full p-4 rounded-2xl gradient-primary flex items-center gap-4 shadow-glow"
        >
          <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-primary-foreground">Contact Support</p>
            <p className="text-sm text-primary-foreground/80">Get help from our team</p>
          </div>
        </motion.button>

        {/* FAQ Categories */}
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category, categoryIndex) => (
            <motion.section
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + categoryIndex * 0.05 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <category.icon className="h-4 w-4 text-foreground" />
                </div>
                <h2 className="font-semibold text-foreground">{category.title}</h2>
              </div>
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`${category.title}-${index}`}
                    className="bg-card rounded-xl border-none px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <span className="text-left text-foreground">{faq.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.section>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No results found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different search term
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
