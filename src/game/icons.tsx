import { Icon } from "@iconify/react";
import React from "react";

export const ICONS = {
  // Context Menu
  talk: "streamline-pixel:interface-essential-message",
  rock: "streamline-pixel:hand-fiist",
  walk: "streamline-pixel:interface-essential-move",
  profile: "streamline-pixel:interface-essential-profile-male",
  game: "streamline-pixel:entertainment-events-hobbies-game-machines-arcade-1",
  paint: "streamline-pixel:design-color-bucket",
  trash: "streamline-pixel:interface-essential-bin",
  quests: "streamline-pixel:interface-essential-find-text",
  shop: "streamline-pixel:shopping-shipping-basket",
  inventory: "streamline-pixel:shopping-shipping-box",
  whiteboard: "streamline-pixel:content-files-draw-content",
  coins: "streamline-pixel:business-money-coin-currency",
  backpack: "streamline-pixel:shopping-shipping-bag-1",
  place: "streamline-pixel:interface-essential-key",
  move: "streamline-pixel:interface-essential-move",
  pet: "streamline-pixel:pet-animals-cat",
  furniture: "streamline-pixel:entertainment-events-hobbies-video-movie-producer-director-chair",

  // Admin Panel
  admin: "streamline-pixel:interface-essential-cog-browser",
  users: "streamline-pixel:multiple-user",
  players: "streamline-pixel:user-single-aim",
  star: "streamline-pixel:social-rewards-rating-star-1",
  camera: "streamline-pixel:photography-camera-1",
  badge: "streamline-pixel:interface-essential-crown",
  trophy: "streamline-pixel:interface-essential-trophy",

  // Achievements
  achievement_talk: "streamline-pixel:interface-essential-message",
  achievement_smoker: "streamline-pixel:interface-essential-flash",
  achievement_gambler: "streamline-pixel:entertainment-events-hobbies-board-game-dice",
  achievement_rich: "streamline-pixel:business-products-wallet-money",
  achievement_designer: "streamline-pixel:design-color-painting-palette",
  achievement_social: "streamline-pixel:hand-like",
  achievement_victim: "streamline-pixel:pet-animals-rabbit-1",
  achievement_detective: "streamline-pixel:interface-essential-search-1",
  achievement_petlover: "streamline-pixel:pet-animals-dog",

  // Minigames
  cigarette: "streamline-pixel:interface-essential-flash",
  basketball: "streamline-pixel:entertainment-events-hobbies-game-pool-snooker-ball",
  timer: "streamline-pixel:interface-essential-stopwatch",
  cards: "streamline-pixel:entertainment-events-hobbies-card-game-card-club",
  book: "streamline-pixel:content-files-open-book",

  // HUD
  coin: "streamline-pixel:business-money-coin-currency",
  gear: "streamline-pixel:interface-essential-cog-double",
  medal: "streamline-pixel:entertainment-events-hobbies-reward-winner-talent",
  crown: "streamline-pixel:interface-essential-crown",

  // RPS
  fist: "streamline-pixel:hand-fiist",
  palm: "streamline-pixel:hand",
  scissors: "streamline-pixel:hand-fight-2-finger",

  // Chat
  fire: "streamline-pixel:ecology-global-warming-globe-fire",
  skull: "streamline-pixel:health-laboratory",
  eyes: "streamline-pixel:interface-essential-view-eye",
  thumbsUp: "streamline-pixel:hand-like",
  love: "streamline-pixel:hand-love",
  wave: "streamline-pixel:hand",
  laugh: "streamline-pixel:email-emoji-smile-smart",
  gift: "streamline-pixel:business-product-report-present-grahp",

  // Leaderboard
  gold: "streamline-pixel:interface-essential-crown",
  silver: "streamline-pixel:social-rewards-rating-star-2",
  bronze: "streamline-pixel:social-rewards-rating-star-1",

  // Achievement Icons (20 for admin picker)
  icon1: "streamline-pixel:interface-essential-trophy",
  icon2: "streamline-pixel:interface-essential-crown",
  icon3: "streamline-pixel:business-money-coin-currency",
  icon4: "streamline-pixel:business-products-wallet-money",
  icon5: "streamline-pixel:hand-like",
  icon6: "streamline-pixel:hand-love",
  icon7: "streamline-pixel:entertainment-events-hobbies-board-game-dice",
  icon8: "streamline-pixel:entertainment-events-hobbies-card-game-card-club",
  icon9: "streamline-pixel:design-color-painting-palette",
  icon10: "streamline-pixel:content-files-open-book",
  icon11: "streamline-pixel:interface-essential-message",
  icon12: "streamline-pixel:interface-essential-view-eye",
  icon13: "streamline-pixel:ecology-global-warming-globe-fire",
  icon14: "streamline-pixel:pet-animals-cat",
  icon15: "streamline-pixel:pet-animals-dog",
  icon16: "streamline-pixel:shopping-shipping-basket",
  icon17: "streamline-pixel:interface-essential-search-1",
  icon18: "streamline-pixel:entertainment-events-hobbies-game-machines-arcade-1",
  icon19: "streamline-pixel:design-color-bucket",
  icon20: "streamline-pixel:business-product-target",
} as const;

export type IconKey = keyof typeof ICONS;

export const GameIcon = ({ icon, size = 18, className = "" }: { icon: IconKey | string; size?: number; className?: string }) => {
  const iconPath = ICONS[icon as IconKey] || icon;
  return <Icon icon={iconPath} width={size} height={size} className={className} />;
};

export const ACHIEVEMENT_ICON_KEYS: IconKey[] = [
  "icon1", "icon2", "icon3", "icon4", "icon5",
  "icon6", "icon7", "icon8", "icon9", "icon10",
  "icon11", "icon12", "icon13", "icon14", "icon15",
  "icon16", "icon17", "icon18", "icon19", "icon20",
];
