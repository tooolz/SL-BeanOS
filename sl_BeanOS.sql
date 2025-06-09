/*
 Navicat Premium Dump SQL

 Source Server         : fyn.io
 Source Server Type    : MariaDB
 Source Server Version : 110802 (11.8.2-MariaDB)
 Source Host           : 172.16.1.3:3306
 Source Schema         : sl_BeanOS

 Target Server Type    : MariaDB
 Target Server Version : 110802 (11.8.2-MariaDB)
 File Encoding         : 65001

 Date: 09/06/2025 23:00:31
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for _app_cinema_
-- ----------------------------
DROP TABLE IF EXISTS `_app_cinema_`;
CREATE TABLE `_app_cinema_`  (
  `key` int(11) NOT NULL AUTO_INCREMENT,
  `tmdb_key` int(11) NOT NULL,
  `title` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `poster_path` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `backdrop_path` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `release_date` date NULL DEFAULT NULL,
  `tmdb_genres` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `tmbd_vote_average` float NULL DEFAULT NULL,
  `tmdb_vote_count` int(11) NULL DEFAULT NULL,
  `subtitles` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `file_path` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  PRIMARY KEY (`key`, `tmdb_key`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf32 COLLATE = utf32_uca1400_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _app_cinema_types
-- ----------------------------
DROP TABLE IF EXISTS `_app_cinema_types`;
CREATE TABLE `_app_cinema_types`  (
  `tmdb_id` int(11) NOT NULL,
  `name` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`tmdb_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf32 COLLATE = utf32_uca1400_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _app_music_albums_
-- ----------------------------
DROP TABLE IF EXISTS `_app_music_albums_`;
CREATE TABLE `_app_music_albums_`  (
  `deezer_id` bigint(255) NOT NULL,
  `deezer_artist` bigint(255) NULL DEFAULT NULL,
  `title` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `genres` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `release_date` date NULL DEFAULT NULL,
  `cover_small` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `cover_medium` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `cover_big` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  PRIMARY KEY (`deezer_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _app_music_artists_
-- ----------------------------
DROP TABLE IF EXISTS `_app_music_artists_`;
CREATE TABLE `_app_music_artists_`  (
  `deezer_id` int(11) NOT NULL,
  `name` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `picture_small` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `picture_medium` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `picture_big` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  PRIMARY KEY (`deezer_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _app_music_genres_
-- ----------------------------
DROP TABLE IF EXISTS `_app_music_genres_`;
CREATE TABLE `_app_music_genres_`  (
  `deezer_id` int(11) NOT NULL,
  `name` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `picture_small` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `picture_medium` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `picture_big` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`deezer_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf32 COLLATE = utf32_uca1400_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _app_music_requests_
-- ----------------------------
DROP TABLE IF EXISTS `_app_music_requests_`;
CREATE TABLE `_app_music_requests_`  (
  `key` int(11) NOT NULL AUTO_INCREMENT,
  `owner` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `request_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `yt_uploader` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `yt_title` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `yt_id` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `forfilled` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `sl_unpacker` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `sl_notecard` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `sl_folder` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `sl_uuids` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `sl_cliplength` float NULL DEFAULT NULL,
  `deezer_id` bigint(20) NULL DEFAULT 0,
  `deezer_artist` bigint(20) NULL DEFAULT 0,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 270159 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _app_music_songs_
-- ----------------------------
DROP TABLE IF EXISTS `_app_music_songs_`;
CREATE TABLE `_app_music_songs_`  (
  `deezer_id` bigint(11) NOT NULL,
  `deezer_artist` int(11) NOT NULL,
  `title` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `title_short` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `deezer_album` int(11) NULL DEFAULT NULL,
  `release_date` date NULL DEFAULT NULL,
  `duration` int(11) NULL DEFAULT NULL,
  `preview` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `bpm` float NULL DEFAULT NULL,
  PRIMARY KEY (`deezer_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _app_wallpapers_
-- ----------------------------
DROP TABLE IF EXISTS `_app_wallpapers_`;
CREATE TABLE `_app_wallpapers_`  (
  `key` int(11) NOT NULL AUTO_INCREMENT,
  `name` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `type` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `filename` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `owner` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `rating` int(11) NOT NULL,
  `rated_by` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `adult` int(11) NOT NULL,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf32 COLLATE = utf32_uca1400_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _app_wallpapers_types_
-- ----------------------------
DROP TABLE IF EXISTS `_app_wallpapers_types_`;
CREATE TABLE `_app_wallpapers_types_`  (
  `name` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`name`(64)) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf32 COLLATE = utf32_uca1400_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _applist_
-- ----------------------------
DROP TABLE IF EXISTS `_applist_`;
CREATE TABLE `_applist_`  (
  `app_key` int(128) NOT NULL,
  `app_type` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `app_name` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `app_url` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `app_icon` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL
) ENGINE = InnoDB CHARACTER SET = utf32 COLLATE = utf32_uca1400_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _applist_types_
-- ----------------------------
DROP TABLE IF EXISTS `_applist_types_`;
CREATE TABLE `_applist_types_`  (
  `name` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `count` int(11) NOT NULL,
  PRIMARY KEY (`name`(64)) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf32 COLLATE = utf32_uca1400_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _usercredit_
-- ----------------------------
DROP TABLE IF EXISTS `_usercredit_`;
CREATE TABLE `_usercredit_`  (
  `uuid` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `credit` bigint(20) NULL DEFAULT 1000
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for _userlist_
-- ----------------------------
DROP TABLE IF EXISTS `_userlist_`;
CREATE TABLE `_userlist_`  (
  `uuid` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `username` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `userpic` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NOT NULL,
  `registered_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `lastactive_date` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  `validationcode` int(11) NOT NULL,
  `validationcode_date` timestamp NULL DEFAULT NULL,
  `validated_date` timestamp NULL DEFAULT NULL,
  `keycode` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `banned` int(1) NOT NULL DEFAULT 0,
  `banned_reason` text CHARACTER SET utf32 COLLATE utf32_uca1400_ai_ci NULL DEFAULT NULL,
  `banned_date` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`uuid`(64)) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf32 COLLATE = utf32_uca1400_ai_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
