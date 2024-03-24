export type Poll = {
  id: string;
  title: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  votes1: number;
  votes2: number;
  votes3: number;
  votes4: number;
  created_at: number;
};


export type Game = {
  id: string;
  title:string;
  positionX: number;
  positionY: number;
  lastDirection: string;
  team1: string;
  team2: string;
  team3: string;
  team4: string;
  created_at: number;
};


export type PlayerData = {
  fid: number;
  name: string;
  positionX: number;
  positionY: number;
  lastDirection: string;
};