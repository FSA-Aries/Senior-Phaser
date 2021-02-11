import Phaser from "phaser";
import assets from "../../public/assets/index"

import Fumiko from "../classes/Fumiko";
import Player from "../classes/Player";
import BaseScene from "./BaseScene";

export default class CharacterSelect extends BaseScene {

    constructor() {
        super('characterSelect')
        this.selection = undefined;
        this.chosenCharacter = undefined
        this.startInstructions = undefined

        this.menu = [
            { key: assets.TANK_SELECT_KEY, character: Player },
            { key: assets.FUMIKO_SELECT_KEY, character: Fumiko },
            //{ key: "Skeleton", character: "Skeleton" },
            //{ key: "Brandon", character: Player }
        ];
    }

    preload() {
        this.load.image(assets.FUMIKO_SELECT_KEY, assets.FUMIKO_SELECT_URL);
        this.load.image(assets.TANK_SELECT_KEY, assets.TANK_SELECT_URL);

    }


    create() {
        super.create();

        this.createCharacterMenu(this.menu, this.setupMenuEvents.bind(this));


        this.add.text(52, 50, "Select your character", {
            fontSize: "40px",
            color: '#FFFFFF',
        })

        this.chosenCharacter = this.add.text(52, 175, 'Selected', {
            fontSize: "40px",
            color: '#FFFFFF',
        }).setVisible(false)

        this.startInstructions = this.add.text(52, 750, 'Press Space to Start', {
            fontSize: "40px",
            color: '#FFFFFF',
        }).setVisible(false)












        this.input.keyboard.once('keydown-SPACE', this.handleContinue, this)
    }

    update() {





    }




    setupMenuEvents(menuItem) {

        const imageGO = menuItem.imageGO;
        imageGO.setInteractive();
        imageGO.setAlpha(.8)

        imageGO.on("pointerover", () => {
            imageGO.setAlpha(1)
        });

        imageGO.on("pointerout", () => {
            imageGO.setAlpha(.8);
        });

        imageGO.on("pointerdown", () => {


            this.selection = menuItem.character

            this.chosenCharacter.setText(`${menuItem.key} Selected`).setVisible(true)
            this.startInstructions.setVisible(true)

        });

    }

    handleContinue() {

        this.scene.start('grassScene', { character: this.selection })
    }


}