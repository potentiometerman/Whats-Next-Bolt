import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import YouTube from 'react-youtube';
import { Heart, X, AlertTriangle } from 'lucide-react';
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
  const [hiddenVideos, setHiddenVideos] = useState<Set<string>>(new Set());
  const [playerError, setPlayerError] = useState<string | null>(null);
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
    if (data) {
      const visibleVideos = data.filter(video => !hiddenVideos.has(video.id));
      setVideos(visibleVideos);
      if (currentIndex >= visibleVideos.length) {
        setCurrentIndex(Math.max(0, visibleVideos.length - 1));
      }
    }
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
        setPlayerError(null);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setPlayerError(null);
      }
    },
  });

  async function handleLike() {
    if (!user) return;
    
    const video = videos[currentIndex];
    
    if (likedVideos.has(video.id)) {
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

  function handleHideVideo() {
    const video = videos[currentIndex];
    const newHiddenVideos = new Set(hiddenVideos);
    newHiddenVideos.add(video.id);
    setHiddenVideos(newHiddenVideos);
    
    const newVideos = videos.filter(v => v.id !== video.id);
    setVideos(newVideos);
    
    if (currentIndex >= newVideos.length) {
      setCurrentIndex(Math.max(0, newVideos.length - 1));
    }
  }

  function handlePlayerError(error: any) {
    console.error('YouTube Player Error:', error);
    if (error.data === 2) {
      setPlayerError('This video is unavailable. Please try another one.');
    } else {
      setPlayerError('An error occurred while playing the video. Please try again later.');
    }
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No videos available</p>
        {hiddenVideos.size > 0 && (
          <button
            onClick={() => {
              setHiddenVideos(new Set());
              loadVideos();
            }}
            className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Reset hidden videos
          </button>
        )}
      </div>
    );
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
        {playerError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-700">{playerError}</p>
              <a
                href={`https://www.youtube.com/watch?v=${currentVideo.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
              >
                Watch on YouTube
              </a>
            </div>
          </div>
        )}
        
        <YouTube
          videoId={currentVideo.youtube_id}
          opts={{
            width: '100%',
            height: '400',
            playerVars: {
              autoplay: 1,
              modestbranding: 1,
              rel: 0,
              controls: 1,
              iv_load_policy: 3,
              fs: 1
            },
          }}
          onError={handlePlayerError}
          className="youtube-player"
        />
        
        <div className="absolute bottom-4 right-4 flex gap-2">
          {user && (
            <button
              onClick={handleLike}
              className={`bg-white p-2 rounded-full shadow-lg transition-transform hover:scale-110 ${
                isLiked ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              <Heart className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            onClick={handleHideVideo}
            className="bg-white p-2 rounded-full shadow-lg transition-transform hover:scale-110 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="mt-4 text-center">
        <h3 className="text-xl font-bold">{currentVideo.title}</h3>
        <p className="text-gray-600">
          {currentVideo.location} • {currentVideo.video_type}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Video {currentIndex + 1} of {videos.length}
        </p>
      </div>
    </div>
  );
}