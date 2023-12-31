"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("../db"));
async function fetchPlayersData(matchId, teamId) {
    try {
        const response = await axios_1.default.get(`https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}/team/${teamId}`, {
            headers: {
                'X-RapidAPI-Key': 'ff273d0016mshaecdc76688df7a2p1190f5jsnfd09f547feb5',
                'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
            },
        });
        const playersData = response.data?.players;
        if (!playersData) {
            console.warn('No players data found for match ID:', matchId);
            return []; // Skip processing for this match ID
        }
        if (playersData && Array.isArray(playersData.Squad)) {
            // If the response data has 'Squad' as an array, then it's the desired structure
            return playersData.Squad.map((player) => ({
                id: player.id,
                name: player.name,
                fullName: player.fullName,
                nickName: player.nickName,
                captain: player.captain,
                role: player.role,
                keeper: player.keeper,
                substitute: player.substitute,
                teamId: player.teamId,
                battingStyle: player.battingStyle,
                bowlingStyle: player.bowlingStyle,
                teamName: player.teamName,
                faceImageId: player.faceImageId,
            }));
        }
        else if (playersData &&
            Array.isArray(playersData['playing XI']) &&
            Array.isArray(playersData.bench)) {
            // If the response data has both 'playing XI' and 'bench' as arrays, then concatenate and create 'Squad'
            const playingXI = playersData['playing XI'];
            const bench = playersData.bench;
            const squad = playingXI.concat(bench).map((player) => ({
                id: player.id,
                name: player.name,
                fullName: player.fullName,
                nickName: player.nickName,
                captain: player.captain,
                role: player.role,
                keeper: player.keeper,
                substitute: player.substitute,
                teamId: player.teamId,
                battingStyle: player.battingStyle,
                bowlingStyle: player.bowlingStyle,
                teamName: player.teamName,
                faceImageId: player.faceImageId,
            }));
            return squad;
        }
        else {
            console.error('Invalid response data for players data:', playersData);
            throw new Error('Invalid response data for players data.');
        }
    }
    catch (error) {
        console.error('Error fetching players data:', error);
        throw new Error('Failed to fetch players data.');
    }
}
const playersResolvers = {
    Mutation: {
        storePlayersData: async () => {
            try {
                const successMessages = [];
                // Fetch match data from the database and get the first 10 matches sorted by startDate ASC.
                const query = `
          SELECT match_id, team1_id, team2_id FROM upcoming_matches
          ORDER BY start_date ASC
          LIMIT 10;
        `;
                const { rows } = await db_1.default.query(query);
                // Fetch and store players' data for each match and team
                for (const row of rows) {
                    const { match_id, team1_id, team2_id } = row;
                    // Fetch and store players' data for team1
                    const playersDataTeam1 = await fetchPlayersData(match_id, team1_id);
                    await storePlayersDataInDB(playersDataTeam1);
                    // Fetch and store players' data for team2
                    const playersDataTeam2 = await fetchPlayersData(match_id, team2_id);
                    await storePlayersDataInDB(playersDataTeam2);
                    successMessages.push(`Players data stored successfully for Match ID: ${match_id}`);
                }
                return successMessages;
            }
            catch (error) {
                console.error('Error storing players data:', error);
                throw new Error('Failed to store players data.');
            }
        },
    },
};
async function storePlayersDataInDB(playersData) {
    try {
        const insertQuery = `
      INSERT INTO players (id, name, fullName, nickName, captain, role, keeper, substitute, teamId, battingStyle, bowlingStyle, teamName, faceImageId)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT DO NOTHING;
    `;
        for (const player of playersData) {
            const { id, name, fullName, nickName, captain, role, keeper, substitute, teamId, battingStyle, bowlingStyle, teamName, faceImageId, } = player;
            await db_1.default.query(insertQuery, [
                id,
                name,
                fullName,
                nickName,
                captain,
                role,
                keeper,
                substitute,
                teamId,
                battingStyle,
                bowlingStyle,
                teamName,
                faceImageId,
            ]);
        }
    }
    catch (error) {
        console.error('Error storing players data in DB:', error);
        throw new Error('Failed to store players data in DB.');
    }
}
exports.default = playersResolvers;
//# sourceMappingURL=playersDataResolver.js.map