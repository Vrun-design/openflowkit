import { useEffect, useState } from 'react';

const GITHUB_REPO_API_URL = 'https://api.github.com/repos/Vrun-design/openflowkit';

let cachedStars: number | null = null;
let starsRequest: Promise<number | null> | null = null;

function getStargazerCount(data: unknown): number | null {
  if (
    typeof data === 'object' &&
    data !== null &&
    'stargazers_count' in data &&
    typeof data.stargazers_count === 'number'
  ) {
    return data.stargazers_count;
  }

  return null;
}

function fetchGithubStars(): Promise<number | null> {
  if (cachedStars !== null) {
    return Promise.resolve(cachedStars);
  }

  if (starsRequest !== null) {
    return starsRequest;
  }

  starsRequest = fetch(GITHUB_REPO_API_URL)
    .then((response) => response.json())
    .then((data) => {
      const nextStars = getStargazerCount(data);
      if (nextStars === null) {
        return null;
      }

      cachedStars = nextStars;
      return cachedStars;
    })
    .catch(() => null)
    .finally(() => {
      starsRequest = null;
    });

  return starsRequest;
}

export function useGithubStars(): number | null {
  const [stars, setStars] = useState<number | null>(cachedStars);

  useEffect(() => {
    let isMounted = true;

    void fetchGithubStars().then((nextStars) => {
      if (isMounted) {
        setStars(nextStars);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return stars;
}
