import React, { useState, useEffect } from "react";
import { UserPlus, UserCheck, UserMinus, Loader2, ArrowLeft } from "lucide-react";
import { Card, Badge } from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import api from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

const ConnectionsList = ({ userId, type = 'followers', onBack, onViewProfile, showHeader = true, onViewerProfileRefresh }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const { user } = useAuth();
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    fetchConnections();
  }, [userId, type]);

  const resolveRelationship = (record) => {
    if (record?.relationship) return record.relationship;
    const followsViewer = !!(record?.follows_viewer ?? record?.is_followed_by);
    const isFollowing = !!record?.is_following;
    if (record?.is_connected || (isFollowing && followsViewer)) return 'connected';
    if (isFollowing) return 'following';
    if (followsViewer) return 'follower';
    return 'none';
  };

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (type === 'followers') {
        data = await api.getFollowers(userId, 1, 50);
        setConnections(data.users || []);
      } else if (type === 'connections') {
        if (!isOwnProfile) {
          setConnections([]);
          setError("Connections are only visible on your profile.");
        } else {
          data = await api.getFollowers(userId, 1, 50);
          const users = data.users || [];
          setConnections(users.filter(userRecord => resolveRelationship(userRecord) === 'connected'));
        }
      } else {
        data = await api.getFollowing(userId, 1, 50);
        setConnections(data.users || []);
      }
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setError(`Failed to load ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetUser) => {
    if (!user) return;
    
    setActionLoadingId(targetUser.id);
    try {
      const currentRelationship = resolveRelationship(targetUser);
      const currentlyFollowing = currentRelationship === 'following' || currentRelationship === 'connected';
      
      if (currentlyFollowing) {
        await api.unfollowUser(targetUser.id);
        
        // Optimistic UI update
        const newRelationship = currentRelationship === 'connected' ? 'follower' : 'none';
        setConnections(prev => prev.map(c => 
          c.id === targetUser.id ? { ...c, relationship: newRelationship } : c
        ));
        
        // Optimistic remove if looking at your own following or connections list
        if (isOwnProfile && (type === 'following' || type === 'connections')) {
            setConnections(prev => prev.filter(c => c.id !== targetUser.id));
        }
      } else {
        await api.followUser(targetUser.id);
        
        // Optimistic UI update
        const newRelationship = currentRelationship === 'follower' ? 'connected' : 'following';
        setConnections(prev => prev.map(c => 
          c.id === targetUser.id ? { ...c, relationship: newRelationship } : c
        ));
        
        // If they were a follower and we followed back while in the "followers" list, 
        // they are still followers but now also connected.
      }
      if (onViewerProfileRefresh) {
        await onViewerProfileRefresh();
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-jurisma-500 mb-4" />
        <p className="text-slate-500">Loading {type}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {showHeader && (
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-jurisma-900 transition-colors rounded-full hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-900 capitalize">
            {type} <span className="text-slate-400 font-normal ml-2">({connections.length})</span>
          </h2>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      {connections.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="text-slate-400" size={24} />
          </div>
          <p className="font-medium text-slate-900 mb-1">No {type} yet</p>
          <p className="text-sm">
            {type === 'connections' && !isOwnProfile
              ? "Connections are only visible on your profile."
              : "When users connect, they will appear here."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((connection) => {
            const relationship = resolveRelationship(connection);
            return (
            <Card key={connection.id} className="p-4 hover:border-jurisma-300 transition-colors flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden cursor-pointer flex-shrink-0"
                onClick={() => onViewProfile(connection.id)}
              >
                {connection.avatar ? (
                  <img src={connection.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  connection.name.charAt(0)
                )}
              </div>
              
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewProfile(connection.id)}>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 truncate hover:text-jurisma-700">{connection.name}</p>
                  {relationship === 'connected' ? (
                    <Badge variant="jurisma" className="text-[10px] py-0 px-1.5 h-4 font-bold border-jurisma-200">Connected</Badge>
                  ) : (relationship === 'follower' || connection.follows_viewer || connection.is_followed_by) && (
                    <Badge variant="slate" className="text-[10px] py-0 px-1.5 h-4 bg-slate-100 text-slate-500 font-medium whitespace-nowrap">Follows you</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{connection.role || connection.credentials || 'Legal Professional'}</p>
                {connection.company && (
                   <p className="text-[10px] text-slate-400 truncate">{connection.company}</p>
                )}
              </div>

              {user && user.id !== connection.id && (
                <Button
                  variant={
                    relationship === 'connected' ? "secondary" :
                    relationship === 'following' ? "outline" :
                    "primary"
                  }
                  size="sm"
                  className={`flex-shrink-0 px-3 h-8 text-[11px] font-bold group/followbtn transition-all duration-200 ${
                    (relationship === 'connected' || relationship === 'following') 
                      ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                      : ''
                  }`}
                  onClick={() => handleFollowToggle(connection)}
                  disabled={actionLoadingId === connection.id}
                >
                  {actionLoadingId === connection.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span className="group-hover/followbtn:hidden flex items-center">
                        {relationship === 'connected' && <><UserCheck size={14} className="mr-1" /> Connected</>}
                        {relationship === 'following' && <><UserCheck size={14} className="mr-1" /> Following</>}
                        {relationship === 'follower' && <><UserPlus size={14} className="mr-1" /> Follow Back</>}
                        {(relationship === 'none' || !relationship) && <><UserPlus size={14} className="mr-1" /> Follow</>}
                      </span>
                      <span className="hidden group-hover/followbtn:flex items-center">
                        {(relationship === 'connected' || relationship === 'following') ? (
                          <><UserMinus size={14} className="mr-1" /> Unfollow</>
                        ) : (relationship === 'follower' ? 'Follow Back' : 'Follow')}
                      </span>
                    </>
                  )}
                </Button>
              )}
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConnectionsList;
