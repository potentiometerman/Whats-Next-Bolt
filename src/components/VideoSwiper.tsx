import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import YouTube from 'react-youtube';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Video {
  id: string;
  youtube_id: string;
  title: string;
  location: string;
  video_type: string;
}

export default function VideoSwiper() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    location: '',
    type: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    loadVideos();
    if (user) {
      loadLikedVideos();
    }
  }, [filters, user]);

  async function loadVideos() {
    let query = supabase.from('videos').select('*');
    
    if (filters.location) {
      query = query.eq('location', filters.location);
    }
    if (filters.type) {
      query = query.eq('video_type', filters.type);
    }

    const { data } = await query;
    if (data) setVideos(data);
  }

  async function loadLikedVideos() {
    if (!user) return;

    const { data } = await supabase
      .from('likes')
      .select('video_id')
      .eq('user_id', user.id);

    if (data) {
      setLikedVideos(new Set(data.map(like => like.video_id)));
    }
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    },
  });

  async function handleLike() {
    if (!user) return;
    
    const video = videos[currentIndex];
    
    // Check if already liked
    if (likedVideos.has(video.id)) {
      // Remove like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', video.id);

      if (!error) {
        const newLikedVideos = new Set(likedVideos);
        newLikedVideos.delete(video.id);
        setLikedVideos(newLikedVideos);
      }
    } else {
      // Add like
      const { error } = await supabase
        .from('likes')
        .insert([{ user_id: user.id, video_id: video.id }])
        .single();

      if (!error) {
        const newLikedVideos = new Set(likedVideos);
        newLikedVideos.add(video.id);
        setLikedVideos(newLikedVideos);
      }
    }
  }

  if (videos.length === 0) {
    return <div className="text-center">No videos found</div>;
  }

  const currentVideo = videos[currentIndex];
  const isLiked = likedVideos.has(currentVideo.id);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex gap-4">
        <select
          className="border p-2 rounded"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        >
          <option value="">All Locations</option>
          <option value="USA">USA</option>
          <option value="Europe">Europe</option>
          <option value="Asia">Asia</option>
        </select>
        
        <select
          className="border p-2 rounded"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="Music">Music</option>
          <option value="Sports">Sports</option>
          <option value="Gaming">Gaming</option>
        </select>
      </div>

      <div {...handlers} className="relative">
        <YouTube
          videoId={currentVideo.youtube_id}
          opts={{
            width: '100%',
            height: '400',
            playerVars: {
              autoplay: 1,
            },
          }}
        />
        
        {user && (
          <button
            onClick={handleLike}
            className={`absolute bottom-4 right-4 bg-white p-2 rounded-full shadow-lg transition-transform hover:scale-110 ${
              isLiked ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            <Heart className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="mt-4 text-center">
        <h3 className="text-xl font-bold">{currentVideo.title}</h3>
        <p className="text-gray-600">
          {currentVideo.location} • {currentVideo.video_type}
        </p>
      </div>
    </div>
  );
}