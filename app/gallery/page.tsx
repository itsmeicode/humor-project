'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/supabaseBrowser';
import { CaptionVoteControls } from './CaptionVoteControls';

type ImageRow = {
  id: string | number;
  url: string;
};

type Caption = {
  id: string | number;
  content: string;
  image_id: string | number;
};

export default function GalleryPage() {
  const router = useRouter();
  const [image, setImage] = useState<ImageRow | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votedCaptionIds, setVotedCaptionIds] = useState<(string | number)[]>(
    []
  );

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();

        const session = sessionData.session;

        if (!session) {
          router.replace('/');
          return;
        }

        setAuthChecked(true);

        const {
          data: existingVotes,
          error: votesError,
        } = await supabase
          .from('caption_votes')
          .select('caption_id')
          .eq('profile_id', session.user.id);

        if (votesError) {
          setError(votesError.message);
          return;
        }

        const alreadyVotedIds =
          existingVotes?.map((v) => v.caption_id as string | number) ?? [];
        setVotedCaptionIds(alreadyVotedIds);

        const {
          data: captionsData,
          error: captionsError,
        } = await supabase
          .from('captions')
          .select('id, content, image_id')
          .eq('is_public', true)
          .not('content', 'is', null)
          .neq('content', '')
          .order('created_datetime_utc', { ascending: false })
          .limit(50);

        if (captionsError) {
          setError(captionsError.message);
          return;
        }

        const votedSet = new Set<string | number>(alreadyVotedIds);
        const storedId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('currentCaptionId')
            : null;

        const chosen =
          (storedId &&
            captionsData?.find(
              (c) =>
                String(c.id) === storedId &&
                !votedSet.has(c.id as string | number)
            )) ||
          captionsData?.find(
            (c) => !votedSet.has(c.id as string | number)
          ) ||
          null;

        if (!chosen) {
          setError('No new captions to rate.');
          return;
        }

        setCaption({
          id: chosen.id,
          content: chosen.content,
          image_id: chosen.image_id,
        });

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'currentCaptionId',
            String(chosen.id)
          );
        }

        console.log('Initial caption loaded:', {
          id: chosen.id,
          content: chosen.content,
          image_id: chosen.image_id,
        });

        const {
          data: imageData,
          error: imagesError,
        } = await supabase
          .from('images')
          .select('id, url')
          .eq('id', chosen.image_id)
          .maybeSingle();

        if (imagesError) {
          setError(imagesError.message);
        } else if (!imageData) {
          setError('No image found for this caption.');
        } else {
          setImage(imageData);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load gallery.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [router]);

  const loadNextCaption = async () => {
    if (!caption) return;

    try {
      const supabase = getBrowserSupabaseClient();

      const allVotedIds = [...votedCaptionIds, caption.id];

      const {
        data: nextCaptions,
        error: nextCaptionsError,
      } = await supabase
        .from('captions')
        .select('id, content, image_id')
        .eq('is_public', true)
        .not('content', 'is', null)
        .neq('content', '')
        .lt('id', caption.id)
        .order('id', { ascending: false })
        .limit(50);

      if (nextCaptionsError) {
        setError(nextCaptionsError.message);
        return;
      }

      const votedSet = new Set<string | number>(allVotedIds);
      const nextCaption =
        nextCaptions?.find(
          (c) => !votedSet.has(c.id as string | number)
        ) || null;

      if (!nextCaption) {
        setError('No more captions to rate.');
        return;
      }

      setCaption({
        id: nextCaption.id,
        content: nextCaption.content,
        image_id: nextCaption.image_id,
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'currentCaptionId',
          String(nextCaption.id)
        );
      }

      console.log('Next caption loaded:', {
        id: nextCaption.id,
        content: nextCaption.content,
        image_id: nextCaption.image_id,
      });

      const {
        data: nextImage,
        error: nextImageError,
      } = await supabase
        .from('images')
        .select('id, url')
        .eq('id', nextCaption.image_id)
        .maybeSingle();

      if (nextImageError) {
        setError(nextImageError.message);
      } else if (!nextImage) {
        setError('No image found for this caption.');
      } else {
        setImage(nextImage);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load the next caption.');
    }
  };

  const handleSignOut = async () => {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (!authChecked || isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <p className="text-sm text-gray-600">Loading your gallery…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="mb-4 text-2xl font-semibold">Gallery</h1>
        <p className="mb-4 text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-sm font-medium text-black underline"
        >
          Back to home
        </button>
      </main>
    );
  }

  if (!image || !caption) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="mb-4 text-2xl font-semibold">Gallery</h1>
        <p className="text-sm text-gray-600">No image and caption to display.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="mb-6 flex w-full max-w-4xl items-center justify-between">
        <h1 className="text-3xl font-bold">Gallery</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-800 hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
          <img
            src={image.url}
            alt=""
            className="mb-6 h-80 w-full rounded-xl object-cover"
          />
          <p className="mb-4 text-center text-lg font-semibold text-gray-900">
            {caption.content}
          </p>
          <CaptionVoteControls
            captionId={caption.id}
            onVoted={() => {
              setVotedCaptionIds((prev) => [...prev, caption.id]);
              void loadNextCaption();
            }}
          />
        </div>
      </div>
    </main>
  );
}