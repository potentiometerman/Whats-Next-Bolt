import React, { useEffect, useState } from 'react';
import YouTube from 'react-youtube';
import { Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LikedVideo {
  id: string;
  videos: {
    id: string;
    youtube_id: string;
    title: string;
    location: string;
    video_type: string;
  };
}

export default function LikedVideos() {
  const [likedVideos, setLikedVideos] = useState<LikedVideo[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadLikedVideos();
    }
  }, [user]);

  async function loadLikedVideos() {
    const { data } = await supabase
      .from('likes')
      .select(`
        id,
        videos (
          id,
          youtube_id,
          title,
          location,
          video_type
        )
      `)
      .eq('user_id', user?.id);

    if (data) setLikedVideos(data);
  }

  async function handleUnlike(likeId: string) {
    await supabase
      .from('likes')
      .delete()
      .eq('id', likeId);
    
    loadLikedVideos();
  }

  return (
    <div className="max-w-4xl mx-auto grid gap-6 grid-cols-1 md:grid-cols-2">
      {likedVideos.map((like) => (
        <div key={like.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          <YouTube
            videoId={like.videos.youtube_id}
            opts={{
              width: '100%',
              height: '200',
            }}
          />
          
          <div className="p-4">
            <h3 className="text-lg font-semibold">{like.videos.title}</h3>
            <p className="text-gray-600">
              {like.videos.location} • {like.videos.video_type}
            </p>
            
            <button
              onClick={() => handleUnlike(like.id)}
              className="mt-2 flex items-center text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Unlike
            </button>
          </div>
        </div>
      ))}

      {likedVideos.length === 0 && (
        <div className="col-span-2 text-center py-8 text-gray-500">
          No liked videos yet
        </div>
      )}
    </div>
  );
}