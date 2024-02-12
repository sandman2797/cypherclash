import {Game, PlayerData} from "@/app/types";
import { getTeamMembers } from "@/pages/api/join"
import {kv} from "@vercel/kv";

type TableDataItem = {
    id: string; // Assuming the ID is a string
    move: string; // The move from MoveObject
    name: string; // The additional data to fetch
    team: string;
};
type MoveObject = {
    [key: string]: string;
};

async function prepareTableData(gameId: string): Promise<TableDataItem[]> {
    const moveHistory: MoveObject[] = await kv.lrange(`moves:${gameId}`, 0, -1);
    const tableDataPromises: Promise<TableDataItem>[] = moveHistory.map(async (item) => {
        const id = Object.keys(item)[0];
        const move = item[id];
        const playerData = await getPlayerData(gameId, id); // Fetch additional data
        let name = playerData?.name;
        let team = playerData?.team;
        if (!name) {
            name = "No Name Found"
        } 
        if (!team) {
            team = "No team found"
        } 
        return { id, move, name, team }; // Structure for table row
    });

    // Resolve all promises to get the complete table data
    const tableData = await Promise.all(tableDataPromises);
    return tableData;
}


async function getPlayerData(gameId: String, fid: String): Promise<PlayerData | null> {
    const playerKey = `player:${gameId}:${fid}`;
    return await kv.hgetall(playerKey);
}

function formatTimeLeft(timeLeft: number, creationStatus: boolean) {
    // Ensure timeLeft is positive; if it's past the deadline, just return "Time's up!"
    if (creationStatus) {
        return "Yet to start";
    }
    if (timeLeft <= 0) {
      return "Time's up!";
    }
  
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
    // Construct the formatted string
    return `${hours}h ${minutes}m ${seconds}s left`;
  }
  
export async function TeamMembersTable({game}: { game: Game}) {

    const teamNames = [game?.team1, game?.team2, game?.team3, game?.team4];

    const gameId = game.id;

    type Teams = {
        [key: string]: PlayerData[];
      };
      
    let teams:Teams = {};
    let teamPromises = teamNames.map(async (teamName) => {
    teams[teamName] = await getTeamMembers(gameId as string, teamName);
    });

    await Promise.all(teamPromises);
    
    return (
      <>
        <div className="team-tabs mr-10">
                    {Object.keys(teams).map((teamName, index) => (
                           <div> 
                           
                    <h2 className="text-lg font-semibold mb-4">{teamName} Members</h2>
                    <table className="border-collapse border border-gray-500" key={index}>
                        <thead>
                            <tr>
                                <th className="border border-gray-400 px-4 py-2 text-gray-800">User</th>
                                <th className="border border-gray-400 px-4 py-2 text-gray-800">Frame NFT</th>
                                <th className="border border-gray-400 px-4 py-2 text-gray-800">Moves Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams[teamName].map((member, index2) => (
                                <tr key={index2}>
                                    <td className="border border-gray-400 px-4 py-2">
                                    <a href={`https://warpcast.com/~/profiles/${member.fid}`} target="_blank" rel="noopener noreferrer" className="warpcast-link">
                                        {member.name}
                                    </a></td>
                                    <td className="border border-gray-400 px-4 py-2">{member.nft}</td>
                                    <td className="border border-gray-400 px-4 py-2">{member.movesLeft}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                           </div>
                    ))}
                </div>
      </>
    );
  }

export async function MoveHistoryTable({game}:{game: Game}) {
    const teamNames = [game?.team1, game?.team2, game?.team3, game?.team4];

    const gameId = game.id;
    const tableData = await prepareTableData(gameId);
    const timeNow = Date.now();
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    const createdAt = Number(game.created_at);
    const timeLeft = createdAt + twentyFourHoursInMs - timeNow;
    const timeLeftFormatted = formatTimeLeft(timeLeft, createdAt == 0);
    return (
        <>
                    {/* Move History */}
                    <div className="move-history ml-10">
                    <h2 className="text-lg font-semibold mb-4">Time Left</h2>
                    
                    <h3 className="text-lg font-semibold mb-4">{timeLeftFormatted}</h3>
                    
                    <h2 className="text-lg font-semibold mb-4">Move History</h2>
                    {/* <div className="move-history-table-container"> */}

                    <table className="border-collapse border border-gray-500">
                        <thead>
                            <tr key="1232">
                                <th className="border border-gray-400 px-4 py-2 text-gray-800">Name</th>
                                <th className="border border-gray-400 px-4 py-2 text-gray-800">Team</th>
                                <th className="border border-gray-400 px-4 py-2 text-gray-800">Direction</th>
                            </tr>
                        </thead>
                        <tbody>

                            {tableData.map(({ id, move, name, team }) => (
                                <tr key={id}>
                                    <td className="border border-gray-400 px-4 py-2">
                                    <a href={`https://warpcast.com/~/profiles/${id}`} target="_blank" rel="noopener noreferrer" className="warpcast-link">
                                        {name}
                                    </a></td>
                                    <td className="border border-gray-400 px-4 py-2">{team}</td>
                                    <td className="border border-gray-400 px-4 py-2">{move}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* </div> */}
                </div>
                </> )
}