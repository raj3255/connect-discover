import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, ExternalLink, Star, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function About() {
  const navigate = useNavigate();

  const features = [
    { icon: Users, title: 'Local Mode', description: 'Find people nearby in your city' },
    { icon: Star, title: 'Global Mode', description: 'Connect with anyone around the world' },
    { icon: Shield, title: 'Privacy First', description: 'Your data is always protected' },
  ];

  const links = [
    { label: 'Terms of Service', url: '#' },
    { label: 'Privacy Policy', url: '#' },
    { label: 'Community Guidelines', url: '#' },
    { label: 'Open Source Licenses', url: '#' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass safe-area-top">
        <div className="flex items-center px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground ml-4">About</h1>
        </div>
      </header>

      <div className="px-6 py-8 space-y-8">
        {/* Logo & Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="h-20 w-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
            <Heart className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-gradient mb-2">Connect</h2>
          <p className="text-muted-foreground">Version 1.0.0</p>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <p className="text-foreground leading-relaxed">
            Connect is designed to help you find meaningful connections, whether 
            they're just around the corner or across the globe. Our mission is to 
            bring people together in a safe, respectful, and fun environment.
          </p>
        </motion.div>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-foreground">Features</h3>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-card"
              >
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Legal Links */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-semibold text-foreground">Legal</h3>
          <div className="rounded-2xl bg-card overflow-hidden divide-y divide-border">
            {links.map((link) => (
              <button
                key={link.label}
                onClick={() => {}}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <span className="text-foreground">{link.label}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-2 pt-4"
        >
          <p className="text-sm text-muted-foreground">
            Made with <Heart className="inline-block h-4 w-4 text-primary mx-1" /> for meaningful connections
          </p>
          <p className="text-xs text-muted-foreground">
            © 2024 Connect. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
