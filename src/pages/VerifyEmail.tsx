import { useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail } = useAuth();
  const { toast } = useToast();
  
  const email = location.state?.email || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      toast({ title: 'Error', description: 'Please enter the complete code', variant: 'destructive' });
      return;
    }

    if (!email) {
      toast({ title: 'Error', description: 'Email not found. Please register again.', variant: 'destructive' });
      navigate('/register');
      return;
    }

    setIsLoading(true);
    try {
      // Pass both code and email to verifyEmail
      // @ts-ignore
      await verifyEmail(fullCode, email);
      toast({ title: 'Success', description: 'Email verified successfully!' });
      navigate('/login', { replace: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Please check and try again';
      toast({ title: 'Invalid Code', description: errorMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast({ title: 'Error', description: 'Email not found', variant: 'destructive' });
      return;
    }

    setResendDisabled(true);
    setCountdown(60);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      // Call the resend-verification endpoint
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Verification code sent to your email' });
      } else {
        toast({ title: 'Error', description: 'Failed to resend code', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast({ title: 'Error', description: 'Failed to resend code', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link to="/register" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex justify-center mb-8">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
            <Mail className="h-10 w-10 text-primary" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground">Verify Your Email</h1>
          <p className="mt-2 text-muted-foreground">
            We've sent a verification code to<br />
            <span className="text-foreground font-medium">{email || 'your email'}</span>
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="max-w-sm mx-auto w-full"
        >
          {/* OTP Inputs */}
          <div className="flex justify-center gap-3 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-lg border border-border bg-input text-foreground focus:ring-2 focus:ring-ring focus:border-primary transition-all"
              />
            ))}
          </div>

          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendDisabled}
                className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendDisabled ? `Resend in ${countdown}s` : 'Resend'}
              </button>
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  );
}