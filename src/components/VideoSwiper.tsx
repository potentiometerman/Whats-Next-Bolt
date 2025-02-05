import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import YouTube from 'react-youtube';
import { Heart, X, AlertTriangle, SkipForward } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
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
    setIsLoading(true);
    try {
      let query = supabase.from('videos').select('*');
      
      if (filters.location) {
        query = query.eq('location', filters.location);
      }
      if (filters.type) {
        query = query.eq('video_type', filters.type);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading videos:', error);
        return;
      }

      if (data) {
        const visibleVideos = data.filter(video => !hiddenVideos.has(video.id));
        setVideos(visibleVideos);
        if (currentIndex >= visibleVideos.length) {
          setCurrentIndex(0);
        }
      }
    } catch (error) {
      console.error('Error in loadVideos:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLikedVideos() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading liked videos:', error);
        return;
      }

      if (data) {
        setLikedVideos(new Set(data.map(like => like.video_id)));
      }
    } catch (error) {
      console.error('Error in loadLikedVideos:', error);
    }
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => handleNextVideo(),
    onSwipedRight: () => {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setPlayerError(null);
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  async function handleLike() {
    if (!user || !videos.length) return;
    
    const video = videos[currentIndex];
    if (!video) return;
    
    try {
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
    } catch (error) {
      console.error('Error in handleLike:', error);
    }
  }

  function handleHideVideo() {
    if (!videos.length) return;
    
    const video = videos[currentIndex];
    if (!video) return;

    const newHiddenVideos = new Set(hiddenVideos);
    newHiddenVideos.add(video.id);
    setHiddenVideos(newHiddenVideos);
    
    const newVideos = videos.filter(v => v.id !== video.id);
    setVideos(newVideos);
    
    if (currentIndex >= newVideos.length) {
      setCurrentIndex(Math.max(0, newVideos.length - 1));
    }
    setPlayerError(null);
  }

  function handleNextVideo() {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPlayerError(null);
    }
  }

  function handlePlayerError(error: any) {
    console.error('YouTube Player Error:', error);
    let errorMessage = 'An error occurred while playing the video. Please try again later.';
    
    if (!videos.length) return;

    switch (error.data) {
      case 2:
        errorMessage = 'This video is unavailable or has been removed from YouTube.';
        handleHideVideo();
        if (currentIndex < videos.length - 1) {
          handleNextVideo();
        }
        break;
      case 5:
        errorMessage = 'The requested content cannot be played in an HTML5 player.';
        break;
      case 100:
        errorMessage = 'The video has been removed or made private.';
        break;
      case 101:
      case 150:
        errorMessage = 'The video cannot be played in embedded players.';
        break;
    }
    
    setPlayerError(errorMessage);
  }

  function handlePlayerReady(event: any) {
    if (!videos.length) return;
    
    try {
      event.target.playVideo();
      setPlayerError(null);
    } catch (error) {
      console.error('Error playing video:', error);
      setPlayerError('Failed to start video playback. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!videos.length) {
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
  if (!currentVideo) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No video selected</p>
      </div>
    );
  }

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
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 rounded-lg z-10">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">{playerError}</p>
              <div className="space-x-4">
                <button
                  onClick={() => handleHideVideo()}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Hide Video
                </button>
                {currentIndex < videos.length - 1 && (
                  <button
                    onClick={handleNextVideo}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Next Video <SkipForward className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        <YouTube
          videoId={currentVideo.youtube_id}
          opts={{
            width: '100%',
            height: '400',
            playerVars: {
              autoplay: 0,
              modestbranding: 1,
              rel: 0,
              controls: 1,
              origin: window.location.origin,
              enablejsapi: 1,
              iv_load_policy: 3,
              fs: 1
            },
          }}
          onError={handlePlayerError}
          onReady={handlePlayerReady}
          className="youtube-player rounded-lg overflow-hidden shadow-lg"
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