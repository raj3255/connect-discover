import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Check, X, Clock, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockUsers } from '@/data/mockUsers';
import { useToast } from '@/hooks/use-toast';

type ShareStatus = 'shared' | 'pending' | 'none';

interface SharedUser {
  id: string;
  name: string;
  avatar: string;
  status: ShareStatus;
  sharedAt?: Date;
}

const mockSharedUsers: SharedUser[] = [
  { ...mockUsers[0], status: 'shared', sharedAt: new Date(Date.now() - 86400000) },
  { ...mockUsers[1], status: 'pending' },
  { ...mockUsers[2], status: 'shared', sharedAt: new Date(Date.now() - 172800000) },
];

export default function AlbumSharing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>(mockSharedUsers);

  const revokeAccess = (userId: string) => {
    setSharedUsers(prev => prev.filter(u => u.id !== userId));
    toast({
      title: "Access revoked",
      description: "User can no longer view your private photos.",
    });
  };

  const cancelRequest = (userId: string) => {
    setSharedUsers(prev => prev.filter(u => u.id !== userId));
    toast({
      title: "Request cancelled",
      description: "Album share request has been cancelled.",
    });
  };

  const filteredUsers = sharedUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sharedList = filteredUsers.filter(u => u.status === 'shared');
  const pendingList = filteredUsers.filter(u => u.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Album Sharing</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-card border border-border"
        >
          <p className="text-sm text-muted-foreground">
            Users with access can view your private photos. You can revoke access at any time.
          </p>
        </motion.div>

        {/* Pending Requests */}
        {pendingList.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-idle" />
              <h2 className="font-semibold text-foreground">Pending Requests</h2>
              <span className="text-sm text-muted-foreground">({pendingList.length})</span>
            </div>
            <div className="space-y-3">
              {pendingList.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-card"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-idle">Awaiting response</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => cancelRequest(user.id)}
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Shared With */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="h-5 w-5 text-success" />
            <h2 className="font-semibold text-foreground">Shared With</h2>
            <span className="text-sm text-muted-foreground">({sharedList.length})</span>
          </div>
          {sharedList.length === 0 ? (
            <div className="py-12 text-center">
              <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No one has access yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share your album with someone to grant access
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedList.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-success flex items-center justify-center">
                        <Check className="h-3 w-3 text-success-foreground" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Shared {user.sharedAt?.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => revokeAccess(user.id)}
                  >
                    Revoke
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
