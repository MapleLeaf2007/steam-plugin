import { db, utils, api } from '#models'
import { Config, Render } from '#components'

/**
 * 获得已绑定的steamId的图片
 * @param {string} bid
 * @param {string} uid
 * @param {string} gid
 * @param {import('models/db').UserColumns[]?} userBindAll
 * @returns {Promise<Object>}
 */
export async function getBindSteamIdsImg (bid, uid, gid, userBindAll = []) {
  if (!userBindAll?.length) {
    userBindAll = await db.UserTableGetDataByUserId(uid)
  }
  if (!userBindAll.length) {
    return '没有绑定任何steamId, 请使用#steam绑定steamId或好友码 进行绑定'
  }
  const accessTokenList = await db.TokenTableGetByUserId(uid)
  const enablePush = (() => {
    if (!Config.push.enable) {
      return false
    }
    if (Config.push.whiteBotList.length && !Config.push.whiteBotList.some(i => i == bid)) {
      return false
    }
    if (Config.push.blackBotList.length && Config.push.blackBotList.some(i => i == bid)) {
      return false
    }
    if (Config.push.whiteGroupList.length && !Config.push.whiteGroupList.some(i => i == gid)) {
      return false
    }
    if (Config.push.blackGroupList.length && Config.push.blackGroupList.some(i => i == gid)) {
      return false
    }
    return true
  })()
  const data = []
  const pushSteamId = []
  const unPushSteamId = []
  const enablePushSteamIdList = enablePush ? await db.PushTableGetAllSteamIdBySteamIdAndGroupId(uid, gid, true) : []
  const userInfo = {}
  try {
    const res = await api.IPlayerService.GetPlayerLinkDetails(userBindAll.map(i => i.steamId))
    res.forEach(i => {
      const avatarhash = Buffer.from(i.public_data.sha_digest_avatar, 'base64').toString('hex')
      userInfo[i.public_data.steamid] = {
        name: i.public_data.persona_name,
        avatar: `https://avatars.steamstatic.com/${avatarhash}_full.jpg`
      }
    })
  } catch { }
  let index = 1
  for (const item of userBindAll) {
    const accessToken = accessTokenList.find(i => i.steamId == item.steamId)
    const i = userInfo[item.steamId] || {}
    const avatar = Config.other.steamAvatar ? i.avatar : await utils.bot.getUserAvatar(bid, uid, gid)
    const info = {
      steamId: item.steamId,
      isBind: item.isBind,
      name: i.name || await utils.bot.getUserName(bid, uid, gid),
      avatar: avatar || await utils.bot.getUserAvatar(bid, uid, gid),
      index,
      type: accessToken ? 'ck' : 'reg'
    }
    if (enablePushSteamIdList.includes(item.steamId)) {
      pushSteamId.push(info)
    } else {
      unPushSteamId.push(info)
    }
    index++
  }
  if (enablePush) {
    if (pushSteamId.length) {
      data.push({
        title: '已开启推送',
        list: pushSteamId
      })
    }
    if (unPushSteamId.length) {
      data.push({
        title: '未开启推送',
        list: unPushSteamId
      })
    }
  } else {
    data.push({
      title: '所有steamId',
      list: unPushSteamId
    })
  }
  const img = await Render.render('user/index', {
    data,
    enablePush,
    random: Math.floor(Math.random() * 5) + 1
  })
  if (img) {
    return img
  } else {
    return '制作图片失败,重试一下'
  }
}
