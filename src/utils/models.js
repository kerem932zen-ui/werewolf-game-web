export const CHARACTER_MODELS = [
    'BaseCharacter', 'BlueSoldier_Female', 'BlueSoldier_Male',
    'Casual2_Female', 'Casual2_Male', 'Casual3_Female', 'Casual3_Male',
    'Casual_Bald', 'Casual_Female', 'Casual_Male',
    'Chef_Female', 'Chef_Male',
    'Cowboy_Female', 'Cowboy_Male',
    'Doctor_Female_Old', 'Doctor_Female_Young', 'Doctor_Male_Old', 'Doctor_Male_Young',
    'Elf', 'Goblin_Female', 'Goblin_Male',
    'Kimono_Female', 'Kimono_Male',
    'Knight_Golden_Female', 'Knight_Golden_Male', 'Knight_Male',
    'Ninja_Female', 'Ninja_Male', 'Ninja_Sand', 'Ninja_Sand_Female',
    'OldClassy_Female', 'OldClassy_Male',
    'Pirate_Female', 'Pirate_Male',
    'Soldier_Female', 'Soldier_Male',
    'Suit_Female', 'Suit_Male',
    'Viking_Female', 'Viking_Male',
    'Witch', 'Wizard',
    'Worker_Female', 'Worker_Male',
    'Zombie_Female', 'Zombie_Male'
];

export const getModelName = (username) => {
    if (!username) return '/models/characters/Casual_Male.gltf';
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % CHARACTER_MODELS.length;
    return `/models/characters/${CHARACTER_MODELS[index]}.gltf`;
};
