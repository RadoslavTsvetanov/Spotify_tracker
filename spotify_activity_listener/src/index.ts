import axios, { AxiosRequestConfig } from "axios";

function validate<T>(val: T) {
    return (compare(val, undefined) || compare(val, null)) 
}

function compare<T>(val1: T, val2: T) {
    return (val1 === val2)
}

enum RequestType {
    GET = "get",
    POST = "post",
    PUT = "put",
    DELETE = "delete"
}

class Token {
    private user_access_to_token: string 
    public token: string = "";

    constructor(token: string) {
        this.user_access_to_token = token;
    }

    get_token(): string {
        return this.token;
    }

    async refresh_token() {
        this.token = await get_permission_token(this.user_access_to_token,"623c7e71f9d940c7937d81a181088ee6","ef77ee4cc25d4cd9a9a52c81abb7bff3");;
    }
}

function req_builder(token: string, method: RequestType, url: string): AxiosRequestConfig {
    return {
        method,
        url,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
}

class State {
    private is_on: boolean;
    public strikes: number;  //since we will be checking if a user is not listening but he could be just switching songs and we catch this exact moment we will be checking two 

    constructor() {
        this.is_on = true;
        this.strikes = 0;
    }

    is_playing() {
        return this.is_on;
    }

    strike() {
        this.strikes += 1;
        if (this.strikes === 2) {
            this.set_is_on(false);
            this.strikes = 0;
        }
    }

    set_is_on(state: boolean) {
        this.is_on = state;
    }
}

class Spotify {
    private token: Token;
    public state: State;

    constructor(token: string) {
        this.token = new Token(token);
        this.state = new State();
    }
    async get_new_token() {
        
    }
    async get_device_id(device_name: string): Promise<string | undefined> {
        return undefined;
    }

    async play_next_song(): Promise<void> {
        try {
            const data =await  axios(req_builder(this.token.get_token(), RequestType.POST, "https://api.spotify.com/v1/me/player/next"));
        } catch (error) {
            console.error(error);
        }
    }

    async check_if_spotify_playing(): Promise<boolean> {
        try {
            const data = await axios(req_builder(this.token.get_token(), RequestType.GET, "https://api.spotify.com/v1/me/player"));
            console.error("axios",data.data)
            if (validate(data)) {
                return false;
            }
            if (data.data.is_playing === false) {
                return false;
            }
            if (data != undefined && data.data != undefined && data.data.is_playing === true) {
                return true;
            }
            return false;
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    async manage_spotify() {
        const is_playing = await this.check_if_spotify_playing();
        if (!is_playing) {
            this.state.strike();
            console.log(" strikin", this.state.strikes)
            console.log("on?",this.state.is_playing())
            
        }
        if (!this.state.is_playing()) {
            console.log("changing")
            await this.play_next_song();
            this.state.set_is_on(true);
        }
        console.log("managing spotify...")
    }

    async update_token() {
        await this.token.refresh_token()
    }
}


async function get_permission_token(refresh_token: string, client_id: string, client_secret: string) {
    const authOptions = {
        method: "POST",
        headers: {
            Authorization: "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=refresh_token&refresh_token=${refresh_token}`,
    };

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", authOptions);
        if (response.status === 200) {
            const data = await response.json();
            const access_token = data.access_token;
            return access_token;
        } else {
            throw new Error("Failed to get access token");
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}



// Call the main function
async function spotify_watch() {
    const response = await axios(req_builder("", RequestType.GET, "http://localhost:8888/all_users"));
    console.log(response.data);
    // const user = new Spotify(response.data.users[0].token)
    // await user.update_token()
    // await user.manage_spotify()

    const spotify_managers: Spotify[] = [];
    response.data.users.forEach((user: { token: string; })=> spotify_managers.push(new Spotify(user.token)))

    setInterval(async () => {
        for (let i = 0; i < spotify_managers.length; i++){
            await spotify_managers[i].manage_spotify()
        }
    }, 1000 * 5)

    setInterval(async () => {
        for (let i = 0; i < spotify_managers.length; i++){
            await spotify_managers[i].update_token()
        }
    }, 1000 * 2)
    
}



spotify_watch()