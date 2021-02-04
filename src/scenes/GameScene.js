import Phaser, { Scene } from "phaser";
import Zombie from "../classes/Enemies/Zombie.js";
import Skeleton from "../classes/Enemies/Skeleton.js";
import Player from "../classes/Player";
import Bullet from "../classes/Bullet";
import assets from "../../public/assets";
import socket from "../socket/index.js";

import EventEmitter from "../events/Emitter";
import { config } from "../main";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("game-scene");
    this.player = undefined;
    this.cursors = undefined;
    this.game = undefined;
    this.reticle = undefined;
    //Setup Sockets
    this.socket = socket;
    this.state = {};
    //maybe we don't need to do line 23
    this.otherPlayers = undefined;
  }

  ///// PRELOAD /////
  preload() {
    this.load.image(assets.BULLET_KEY, assets.BULLET_URL);
    this.load.image(assets.RETICLE_KEY, assets.RETICLE_URL);
    this.load.image(assets.TILESET_KEY, assets.TILESET_URL);
    this.load.tilemapTiledJSON(assets.TILEMAP_KEY, assets.TILEMAP_URL);
    this.load.spritesheet(assets.PLAYER_KEY, assets.PLAYER_URL, {
      frameWidth: 50,
      frameHeight: 69,
    });

    //Enemies
    this.load.spritesheet(assets.ZOMBIE_KEY, assets.ZOMBIE_URL, {
      frameWidth: 30,
      frameHeight: 60,
    });
    this.load.spritesheet(assets.SKELETON_KEY, assets.SKELETON_URL, {
      frameWidth: 30,
      frameHeight: 64,
    });
    // this.physics.add.sprite(400, 375, assets.PLAYER_KEY);
  }

  ///// CREATE /////
  create({ gameStatus }) {
    let map = this.make.tilemap({ key: assets.TILEMAP_KEY });
    let tileSet = map.addTilesetImage("TiledSet", assets.TILESET_KEY);
    map.createLayer("Ground", tileSet, 0, 0);
    map.createLayer("Walls", tileSet, 0, 0);

    this.player = this.createPlayer();
    this.player.setTexture(assets.PLAYER_KEY, 1);
    this.skeleton = this.createSkeleton();

    //Zombie and Skeleton Groups
    let zombieGroup = this.add.group();
    let skeletonGroup = this.add.group();

    // Enemy Creation
    for (let i = 0; i < 2; i++) {
      this.time.addEvent({
        delay: 5000,
        callback: () => {
          zombieGroup.add(this.createZombie());
        },
        loop: true,
      });
    }
    for (let i = 0; i < 1; i++) {
      this.time.addEvent({
        delay: 10000,
        callback: () => {
          skeletonGroup.add(this.createSkeleton());
        },
        loop: true,
      });
    }

    this.physics.add.collider(this.player, zombieGroup, this.onPlayerCollision);
    this.physics.add.collider(
      this.player,
      skeletonGroup,
      this.onPlayerCollision
    );

    this.cursors = this.input.keyboard.createCursorKeys();
    let playerBullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: true,
    });
    this.physics.add.collider(
      playerBullets,
      zombieGroup,
      this.onBulletCollision
    );
    this.physics.add.collider(
      playerBullets,
      skeletonGroup,
      this.onBulletCollision
    );
    this.reticle = this.physics.add.sprite(0, 0, assets.RETICLE_KEY);
    this.reticle.setDisplaySize(25, 25).setCollideWorldBounds(true);

    this.input.on(
      "pointerdown",
      function () {
        if (this.player.active === false) return;

        // Get bullet from bullets group
        let bullet = playerBullets.get().setActive(true).setVisible(true);

        if (bullet) {
          bullet.fire(this.player, this.reticle);
          //this.physics.add.collider(enemy, bullet, enemyHitCallback);
        }
      },
      this
    );

    this.setupFollowupCameraOn(this.player);

    this.input.on(
      "pointermove",
      function (pointer) {
        //console.log(this.input.mousePointer.x)
        const transformedPoint = this.cameras.main.getWorldPoint(
          pointer.x,
          pointer.y
        );

        this.reticle.x = transformedPoint.x;
        this.reticle.y = transformedPoint.y;

        //this.player.rotation = angle;
      },
      this
    );

    this.otherPlayers = this.physics.add.group();

    this.socket.on("setState", function (state) {
      const { roomKey, players, numPlayers } = state;
      this.state.roomKey = roomKey;
      this.state.players = players;
      this.state.numPlayers = numPlayers;
    });

    this.socket.on("currentPlayers", function (playerInfo) {
      const { player, numPlayers } = playerInfo;
      this.state.numPlayers = numPlayers;
      Object.keys(player).forEach(function (id) {
        if (player[id].playerId === this.socket.id) {
          console.log("PLAYER -->", player);
          this.createPlayer(this, player[id]);
        } else {
          this.createOtherPlayers(this, player[id]);
        }
      });
    });

    this.socket.on("newPlayer", function (arg) {
      const { playerInfo, numPlayers } = arg;
      this.addOtherPlayers(this, playerInfo);
      this.state.numPlayers = numPlayers;
    });

    if (gameStatus === "PLAYER_LOSE") {
      return;
    }
    this.createGameEvents();
  }

  //       this
  //     );
  //   }
  update() {}

  ///// HELPER FUNCTIONS /////

  // PLAYER ANIMATION
  createPlayer(player, playerInfo) {
    //maybe we can change player to this
    console.log(playerInfo);
    return new Player(player, playerInfo.x, playerInfo.y);
  }

  createOtherPlayer(player, playerInfo) {
    const otherPlayer = new Player(
      player,
      playerInfo.x + 40,
      playerInfo.y + 40
    );
    otherPlayer.playerId = playerInfo.playerId;
    player.otherPlayers.add(otherPlayer);
  }

  setupFollowupCameraOn(player) {
    this.physics.world.setBounds(
      0,
      0,
      config.width + config.mapOffset,
      config.height
    );

    this.cameras.main
      .setBounds(0, 0, config.width + config.mapOffset, config.height)
      .setZoom(config.zoomFactor);
    this.cameras.main.startFollow(player);
  }
  createZombie() {
    const randomizedPosition = Math.random() * 800;
    return new Zombie(
      this,
      randomizedPosition,
      randomizedPosition,
      assets.ZOMBIE_KEY,
      assets.ZOMBIE_URL,
      this.player
    );
  }
  createSkeleton() {
    const randomizedPosition = Math.random() * 800;
    return new Skeleton(
      this,
      randomizedPosition,
      randomizedPosition,
      assets.SKELETON_KEY,
      assets.SKELETON_URL,
      this.player
    );
  }

  createGameEvents() {
    EventEmitter.on("PLAYER_LOSE", () => {
      this.scene.restart({ gameStatus: "PLAYER_LOSE" });
    });
  }
  onPlayerCollision(player, monster) {
    console.log("HEALTH ->", player.health);
    //It should be the bullet's damage but we will just set a default value for now to test
    // monster.takesHit(player.damage);
    player.takesHit(monster);
    // player.setBounce(0.5, 0.5);
  }

  onBulletCollision(monster, bullet) {
    //console.log('bullet hit')
    //console.log(bullet)
    bullet.hitsEnemy(monster);
  }
}
